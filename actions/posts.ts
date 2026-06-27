"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, posts } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { getDbErrorCode } from "@/lib/db-errors";
import { expandAmazonProductUrl, resolveAmazonProductImageUrl } from "@/lib/amazon-image";
import { coerceProductImageUrl } from "@/lib/image-url";
import { maybePostReviewToPinterest } from "@/lib/pinterest";
import { checkPublishQuality } from "@/lib/post-quality";
import { PostEditorSchema, type PostEditorInput } from "@/lib/validations";

export type PostActionState = { ok: boolean; message?: string; id?: string };

/** Maps a thrown value to a user-facing message; a stale session reads as such. */
function toActionError(e: unknown, fallback = "Something went wrong."): string {
  if (e instanceof Error && e.message === "Unauthorized") {
    return "Your session expired. Sign in again.";
  }
  return fallback;
}

function parseSpecs(value: string | undefined): Record<string, string> {
  if (!value?.trim()) return {};
  const result: Record<string, string> = {};
  for (const line of value.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx < 1) continue;
    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim();
    if (key && val) result[key] = val;
  }
  return result;
}

function parseFaqs(value: string | undefined): Array<{ q: string; a: string }> {
  if (!value?.trim()) return [];
  const lines = value.split("\n").map((l) => l.trim()).filter(Boolean);
  const faqs: Array<{ q: string; a: string }> = [];
  for (let i = 0; i < lines.length - 1; i += 2) {
    const q = lines[i].replace(/^Q:\s*/i, "").trim();
    const a = lines[i + 1].replace(/^A:\s*/i, "").trim();
    if (q && a) faqs.push({ q, a });
  }
  return faqs;
}

function parseLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseUrlLines(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return parseLines(value).filter((line) => {
    try {
      new URL(line);
      return true;
    } catch {
      return false;
    }
  });
}

async function preparePostValues(input: PostEditorInput) {
  const amazonUrl = await expandAmazonProductUrl(input.amazon_url);
  let imageUrl = coerceProductImageUrl(input.image_url);
  if (!imageUrl) {
    imageUrl = await resolveAmazonProductImageUrl(amazonUrl);
  }

  const pros = parseLines(input.pros);
  const cons = parseLines(input.cons);
  if (pros.length === 0 || cons.length === 0) {
    throw new Error("At least one pro and one con are required.");
  }

  const now = new Date().toISOString();
  const isPublished = Boolean(input.is_published);

  return {
    title: input.title.trim(),
    slug: input.slug.trim(),
    excerpt: input.excerpt.trim(),
    body: input.body.trim(),
    categoryId: input.category_id,
    rating: input.rating.toString(),
    pros,
    cons,
    verdict: input.verdict.trim(),
    amazonUrl,
    imageUrl,
    galleryUrls: parseUrlLines(input.gallery_urls),
    badge: input.badge?.trim() || null,
    faqs: parseFaqs(input.faqs),
    priceAtReview: input.price_at_review?.trim() || null,
    specs: parseSpecs(input.specs),
    isPublished,
    publishedAt: isPublished ? now : null,
    updatedAt: now,
  };
}

function revalidatePostPaths(slug?: string) {
  revalidatePath("/dashboard/posts");
  revalidatePath("/dashboard");
  revalidatePath("/blog");
  revalidatePath("/");
  if (slug) {
    revalidatePath(`/blog/${slug}`);
  }
}

/** Best-effort Pinterest pin on first publish; never blocks the publish action. */
async function maybePinOnFirstPublish(postId: string) {
  try {
    const [row] = await db
      .select({
        title: posts.title,
        excerpt: posts.excerpt,
        slug: posts.slug,
        rating: posts.rating,
        imageUrl: posts.imageUrl,
        categorySlug: categories.slug,
      })
      .from(posts)
      .innerJoin(categories, eq(posts.categoryId, categories.id))
      .where(eq(posts.id, postId))
      .limit(1);

    if (!row) return;

    await maybePostReviewToPinterest({
      title: row.title,
      excerpt: row.excerpt,
      slug: row.slug,
      categorySlug: row.categorySlug,
      rating: Number(row.rating),
      imageUrl: row.imageUrl,
    });
  } catch (error) {
    console.error("maybePinOnFirstPublish: failed", error);
  }
}

export async function revalidatePostAction(slug: string): Promise<PostActionState> {
  try {
    await requireAdmin();
    revalidatePath(`/blog/${slug}`);
    revalidatePath("/blog");
    revalidatePath("/");
    return { ok: true, message: "Page cache cleared." };
  } catch {
    return { ok: false, message: "Unauthorized." };
  }
}

export async function revalidateSiteAction(): Promise<PostActionState> {
  try {
    await requireAdmin();
    revalidatePath("/", "layout");
    return { ok: true, message: "Full site cache cleared." };
  } catch {
    return { ok: false, message: "Unauthorized." };
  }
}

export async function bulkSetPostsPublished(
  ids: string[],
  is_published: boolean,
): Promise<PostActionState> {
  if (!ids.length) return { ok: false, message: "No posts selected." };
  try {
    await requireAdmin();
    const now = new Date().toISOString();

    const existing = await db
      .select({ id: posts.id, slug: posts.slug, publishedAt: posts.publishedAt })
      .from(posts)
      .where(inArray(posts.id, ids));

    // Pinterest posting is intentionally skipped for bulk publishes: each pin
    // spawns Puppeteer, so generating N inline would risk a server-action
    // timeout. Pin individual posts via setPostPublished/createPost/updatePost.
    for (const post of existing) {
      await db
        .update(posts)
        .set({
          isPublished: is_published,
          publishedAt: is_published && !post.publishedAt ? now : post.publishedAt,
          updatedAt: now,
        })
        .where(eq(posts.id, post.id));

      revalidatePath(`/blog/${post.slug}`);
    }

    revalidatePath("/blog");
    revalidatePath("/dashboard/posts");
    revalidatePath("/");

    return {
      ok: true,
      message: `${existing.length} post${existing.length === 1 ? "" : "s"} ${is_published ? "published" : "unpublished"}.`,
    };
  } catch (e) {
    console.warn(e);
    return { ok: false, message: "Something went wrong." };
  }
}

export async function bulkDeletePosts(ids: string[]): Promise<PostActionState> {
  if (!ids.length) return { ok: false, message: "No posts selected." };
  try {
    await requireAdmin();

    const existing = await db
      .select({ slug: posts.slug })
      .from(posts)
      .where(inArray(posts.id, ids));

    await db.delete(posts).where(inArray(posts.id, ids));

    for (const post of existing) revalidatePath(`/blog/${post.slug}`);
    revalidatePath("/blog");
    revalidatePath("/dashboard/posts");
    revalidatePath("/");

    return {
      ok: true,
      message: `${existing.length} post${existing.length === 1 ? "" : "s"} deleted.`,
    };
  } catch (e) {
    console.warn(e);
    return { ok: false, message: "Something went wrong." };
  }
}

export async function retryPostImage(id: string): Promise<PostActionState> {
  try {
    await requireAdmin();

    const [post] = await db
      .select({ slug: posts.slug, amazonUrl: posts.amazonUrl })
      .from(posts)
      .where(eq(posts.id, id))
      .limit(1);

    if (!post) return { ok: false, message: "Post not found." };

    const imageUrl = await resolveAmazonProductImageUrl(post.amazonUrl);
    if (!imageUrl) {
      return {
        ok: false,
        message:
          "Could not resolve an image from Amazon. Paste the image URL manually in the post editor.",
      };
    }

    await db
      .update(posts)
      .set({ imageUrl, updatedAt: new Date().toISOString() })
      .where(eq(posts.id, id));

    revalidatePostPaths(post.slug);
    return { ok: true, message: "Image updated." };
  } catch (e) {
    console.warn(e);
    return { ok: false, message: toActionError(e) };
  }
}

export async function setPostPublished(
  id: string,
  is_published: boolean,
): Promise<PostActionState> {
  try {
    await requireAdmin();

    const [post] = await db
      .select({
        publishedAt: posts.publishedAt,
        slug: posts.slug,
        body: posts.body,
        faqs: posts.faqs,
        specs: posts.specs,
      })
      .from(posts)
      .where(eq(posts.id, id))
      .limit(1);

    if (!post) {
      return { ok: false, message: "Post not found." };
    }

    if (is_published) {
      const issue = checkPublishQuality({
        body: post.body,
        faqs: Array.isArray(post.faqs)
          ? (post.faqs as Array<{ q: string; a: string }>)
          : [],
        specs:
          post.specs && typeof post.specs === "object" && !Array.isArray(post.specs)
            ? (post.specs as Record<string, string>)
            : {},
      });
      if (issue) return { ok: false, message: issue };
    }

    const firstPublish = is_published && !post.publishedAt;

    await db
      .update(posts)
      .set({
        isPublished: is_published,
        publishedAt:
          is_published && !post.publishedAt
            ? new Date().toISOString()
            : post.publishedAt,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(posts.id, id));

    if (firstPublish) {
      await maybePinOnFirstPublish(id);
    }

    revalidatePostPaths(post.slug);
    return { ok: true };
  } catch (e) {
    console.warn(e);
    return { ok: false, message: toActionError(e) };
  }
}

export async function deletePost(id: string): Promise<PostActionState> {
  try {
    await requireAdmin();

    const [post] = await db
      .select({ slug: posts.slug })
      .from(posts)
      .where(eq(posts.id, id))
      .limit(1);

    await db.delete(posts).where(eq(posts.id, id));

    revalidatePostPaths(post?.slug);
    return { ok: true };
  } catch (e) {
    console.warn(e);
    return { ok: false, message: toActionError(e) };
  }
}

export async function createPost(
  input: PostEditorInput,
): Promise<PostActionState> {
  const parsed = PostEditorSchema.safeParse(input);
  if (!parsed.success) {
    const first =
      Object.values(parsed.error.flatten().fieldErrors).flat()[0] ??
      "Check your inputs.";
    return { ok: false, message: first };
  }

  try {
    await requireAdmin();
    const values = await preparePostValues(parsed.data);

    if (values.isPublished) {
      const issue = checkPublishQuality({
        body: values.body,
        faqs: values.faqs,
        specs: values.specs,
      });
      if (issue) return { ok: false, message: issue };
    }

    const [inserted] = await db
      .insert(posts)
      .values({
        title: values.title,
        slug: values.slug,
        excerpt: values.excerpt,
        body: values.body,
        categoryId: values.categoryId,
        rating: values.rating,
        pros: values.pros,
        cons: values.cons,
        verdict: values.verdict,
        amazonUrl: values.amazonUrl,
        imageUrl: values.imageUrl,
        galleryUrls: values.galleryUrls,
        badge: values.badge,
        faqs: values.faqs,
        priceAtReview: values.priceAtReview,
        specs: values.specs,
        isPublished: values.isPublished,
        publishedAt: values.publishedAt,
        updatedAt: values.updatedAt,
      })
      .returning({ id: posts.id });

    if (values.isPublished && inserted?.id) {
      await maybePinOnFirstPublish(inserted.id);
    }

    revalidatePostPaths(values.slug);
    return { ok: true, id: inserted?.id, message: "Post created." };
  } catch (e) {
    console.warn(e);
    if (getDbErrorCode(e) === "23505") {
      return { ok: false, message: "A post with this slug already exists." };
    }
    const fallback = e instanceof Error ? e.message : undefined;
    return { ok: false, message: toActionError(e, fallback) };
  }
}

export async function updatePost(
  id: string,
  input: PostEditorInput,
): Promise<PostActionState> {
  const parsed = PostEditorSchema.safeParse(input);
  if (!parsed.success) {
    const first =
      Object.values(parsed.error.flatten().fieldErrors).flat()[0] ??
      "Check your inputs.";
    return { ok: false, message: first };
  }

  try {
    await requireAdmin();

    const [existing] = await db
      .select({ publishedAt: posts.publishedAt, slug: posts.slug })
      .from(posts)
      .where(eq(posts.id, id))
      .limit(1);

    if (!existing) {
      return { ok: false, message: "Post not found." };
    }

    const values = await preparePostValues(parsed.data);

    if (values.isPublished) {
      const issue = checkPublishQuality({
        body: values.body,
        faqs: values.faqs,
        specs: values.specs,
      });
      if (issue) return { ok: false, message: issue };
    }

    const firstPublish = values.isPublished && !existing.publishedAt;
    // Retain publishedAt on unpublish (matches setPostPublished) so the first-
    // publish pin does not re-fire when a post is unpublished then republished.
    const publishedAt = firstPublish
      ? new Date().toISOString()
      : existing.publishedAt;

    await db
      .update(posts)
      .set({
        title: values.title,
        slug: values.slug,
        excerpt: values.excerpt,
        body: values.body,
        categoryId: values.categoryId,
        rating: values.rating,
        pros: values.pros,
        cons: values.cons,
        verdict: values.verdict,
        amazonUrl: values.amazonUrl,
        imageUrl: values.imageUrl,
        galleryUrls: values.galleryUrls,
        badge: values.badge,
        faqs: values.faqs,
        priceAtReview: values.priceAtReview,
        specs: values.specs,
        isPublished: values.isPublished,
        publishedAt,
        updatedAt: values.updatedAt,
      })
      .where(eq(posts.id, id));

    if (firstPublish) {
      await maybePinOnFirstPublish(id);
    }

    revalidatePostPaths(existing.slug);
    if (existing.slug !== values.slug) {
      revalidatePostPaths(values.slug);
    }

    return { ok: true, id, message: "Post saved." };
  } catch (e) {
    console.warn(e);
    if (getDbErrorCode(e) === "23505") {
      return { ok: false, message: "A post with this slug already exists." };
    }
    const fallback = e instanceof Error ? e.message : undefined;
    return { ok: false, message: toActionError(e, fallback) };
  }
}

/** Published reviews untouched for this many days are considered stale. */
const STALE_REFRESH_DAYS = 90;

/**
 * Bumps `updated_at` on published reviews that have not changed in a while so
 * search engines see a freshness signal and re-crawl them (also refreshes
 * sitemap lastModified). Intended to be triggered periodically by an admin.
 */
export async function refreshStalePosts(): Promise<PostActionState> {
  try {
    await requireAdmin();

    const cutoff = new Date(
      Date.now() - STALE_REFRESH_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
    const now = new Date().toISOString();
    const staleFilter = and(
      eq(posts.isPublished, true),
      lt(posts.updatedAt, cutoff),
    );

    const stale = await db
      .select({ slug: posts.slug })
      .from(posts)
      .where(staleFilter);

    if (stale.length === 0) {
      return { ok: true, message: "All published reviews are already fresh." };
    }

    await db.update(posts).set({ updatedAt: now }).where(staleFilter);

    for (const post of stale) revalidatePath(`/blog/${post.slug}`);
    revalidatePath("/blog");
    revalidatePath("/");

    return {
      ok: true,
      message: `Refreshed ${stale.length} stale review${stale.length === 1 ? "" : "s"}.`,
    };
  } catch (e) {
    console.warn(e);
    return { ok: false, message: toActionError(e) };
  }
}
