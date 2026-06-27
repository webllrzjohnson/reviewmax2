"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { categories, posts } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { generateReviewDraft } from "@/lib/generate-review";

export type GenerateReviewActionResult = {
  ok: boolean;
  slug?: string;
  message?: string;
};

/** Resolves a category id by slug, creating the category if it does not exist. */
async function resolveCategoryId(slug: string): Promise<string | null> {
  const name = slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const [row] = await db
    .insert(categories)
    .values({ name, slug })
    .onConflictDoUpdate({ target: categories.slug, set: { slug } })
    .returning({ id: categories.id });

  return row?.id ?? null;
}

/**
 * Generates a review draft (Claude primary, OpenAI fallback) and inserts it as
 * an unpublished post. Auto-creates the category if needed. Prompt building,
 * the model call, parsing, and the DB insert all happen in-process here.
 */
export async function generateAndInsertReview(params: {
  product_name: string;
  category_slug: string;
  amazon_url: string;
  notes: string | null;
  image_url?: string | null;
}): Promise<GenerateReviewActionResult> {
  await requireAdmin();

  const generated = await generateReviewDraft(params);
  if (!generated.ok) {
    return { ok: false, message: generated.message };
  }

  const draft = generated.draft;

  let categoryId: string | null;
  try {
    categoryId = await resolveCategoryId(draft.categorySlug);
  } catch (error) {
    console.error("generateAndInsertReview: category upsert failed", error);
    return { ok: false, message: "Could not resolve the category." };
  }

  if (!categoryId) {
    return { ok: false, message: "Could not resolve the category." };
  }

  try {
    const [inserted] = await db
      .insert(posts)
      .values({
        title: draft.title,
        slug: draft.slug,
        excerpt: draft.excerpt,
        body: draft.body,
        categoryId,
        rating: draft.rating.toString(),
        pros: draft.pros,
        cons: draft.cons,
        verdict: draft.verdict,
        amazonUrl: draft.amazonUrl,
        imageUrl: draft.imageUrl,
        galleryUrls: [],
        isPublished: false,
        publishedAt: null,
      })
      .returning({ id: posts.id, slug: posts.slug });

    if (!inserted) {
      return { ok: false, message: "Database error while saving the draft." };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/posts");

    return {
      ok: true,
      slug: inserted.slug,
      message: `Draft generated with ${generated.model === "claude" ? "Claude" : "OpenAI"}. Review and publish from the dashboard.`,
    };
  } catch (error) {
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "string"
        ? error.code
        : undefined;

    if (code === "23505") {
      return {
        ok: false,
        message:
          "A review with this slug already exists. Try generating again.",
      };
    }
    if (code === "23503") {
      return { ok: false, message: "Invalid category reference." };
    }

    console.error("generateAndInsertReview: insert error", error);
    return { ok: false, message: "Database error while saving the draft." };
  }
}
