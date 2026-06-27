"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { reviewRequests } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { generateAndInsertReview } from "@/actions/generate-review";
import {
  discoverProducts,
  filterExistingByAsin,
} from "@/lib/product-discovery";

export type DiscoverItemResult = {
  name: string;
  ok: boolean;
  slug?: string;
  message?: string;
};

export type DiscoverActionState = {
  ok: boolean;
  message?: string;
  results?: DiscoverItemResult[];
  skipped?: number;
};

/**
 * Searches a category on Amazon (SerpApi), drops products already reviewed,
 * then generates + saves a draft review for each new product. Mirrors the
 * "Verdict Flow" discovery workflow.
 */
export async function discoverAndEnqueueAction(input: {
  category: string;
  country: string;
}): Promise<DiscoverActionState> {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return { ok: false, message: "Your session expired. Sign in again." };
  }

  const category = input.category?.trim();
  const country = input.country?.trim() || "United States";
  if (!category) {
    return { ok: false, message: "Enter a category to search." };
  }

  const discovered = await discoverProducts(category, country);
  if (!discovered.ok) {
    return { ok: false, message: discovered.message };
  }

  const fresh = await filterExistingByAsin(discovered.products);
  const skipped = discovered.products.length - fresh.length;

  if (fresh.length === 0) {
    return {
      ok: true,
      skipped,
      results: [],
      message: `Found ${discovered.products.length} products, all already reviewed.`,
    };
  }

  const results: DiscoverItemResult[] = [];

  for (const product of fresh) {
    let requestId: string | null = null;
    try {
      const [inserted] = await db
        .insert(reviewRequests)
        .values({
          productName: product.name,
          categorySlug: product.category,
          amazonUrl: product.amazon_url,
          notes: null,
          createdBy: session.user.id,
        })
        .returning({ id: reviewRequests.id });
      requestId = inserted?.id ?? null;
    } catch (error) {
      console.error("discoverAndEnqueueAction: enqueue failed", error);
    }

    const generated = await generateAndInsertReview({
      product_name: product.name,
      category_slug: product.category,
      amazon_url: product.amazon_url,
      notes: null,
      image_url: product.image_url,
    });

    if (requestId) {
      try {
        await db
          .update(reviewRequests)
          .set(
            generated.ok
              ? {
                  processedAt: new Date().toISOString(),
                  processedBy: session.user.id,
                  processError: null,
                }
              : { processError: generated.message ?? "Generation failed." },
          )
          .where(eq(reviewRequests.id, requestId));
      } catch (error) {
        console.error("discoverAndEnqueueAction: status update failed", error);
      }
    }

    results.push({
      name: product.name,
      ok: generated.ok,
      slug: generated.slug,
      message: generated.message,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/posts");
  revalidatePath("/dashboard/review-requests");

  const created = results.filter((r) => r.ok).length;
  return {
    ok: true,
    skipped,
    results,
    message: `Generated ${created} of ${fresh.length} new products${
      skipped ? ` (${skipped} skipped as duplicates)` : ""
    }.`,
  };
}
