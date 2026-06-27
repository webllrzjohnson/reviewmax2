"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { reviewRequests } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { expandAmazonProductUrl } from "@/lib/amazon-image";
import { generateAndInsertReview } from "@/actions/generate-review";
import {
  ReviewRequestSchema,
  type ReviewRequestInput,
} from "@/lib/validations";

export type ReviewRequestState = {
  ok: boolean;
  message?: string;
  slug?: string;
};

/**
 * Validates with ReviewRequestSchema, inserts into `review_requests`, then
 * generates a review draft in-app (OpenAI) and saves it as an unpublished post.
 * The request row is marked processed on success or stamped with the error.
 */
export async function submitReviewRequestAction(
  input: ReviewRequestInput,
): Promise<ReviewRequestState> {
  const parsed = ReviewRequestSchema.safeParse(input);
  if (!parsed.success) {
    const first =
      Object.values(parsed.error.flatten().fieldErrors).flat()[0] ??
      "Check your inputs";
    return { ok: false, message: first };
  }

  try {
    const session = await requireAdmin();
    const amazonUrl = await expandAmazonProductUrl(parsed.data.amazon_url);
    const notes =
      parsed.data.notes != null && parsed.data.notes.trim() !== ""
        ? parsed.data.notes.trim()
        : null;

    const [inserted] = await db
      .insert(reviewRequests)
      .values({
        productName: parsed.data.product_name,
        categorySlug: parsed.data.category,
        amazonUrl,
        notes,
        createdBy: session.user.id,
      })
      .returning({ id: reviewRequests.id });

    if (!inserted) {
      return { ok: false, message: "Something went wrong." };
    }

    const generated = await generateAndInsertReview({
      product_name: parsed.data.product_name,
      category_slug: parsed.data.category,
      amazon_url: amazonUrl,
      notes,
    });

    if (generated.ok) {
      await db
        .update(reviewRequests)
        .set({
          processedAt: new Date().toISOString(),
          processedBy: session.user.id,
          processError: null,
        })
        .where(eq(reviewRequests.id, inserted.id));

      revalidatePath("/dashboard");
      revalidatePath("/dashboard/review-requests");
      return {
        ok: true,
        slug: generated.slug,
        message: generated.message ?? "Review draft generated.",
      };
    }

    await db
      .update(reviewRequests)
      .set({ processError: generated.message ?? "Generation failed." })
      .where(eq(reviewRequests.id, inserted.id));

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/review-requests");
    return {
      ok: true,
      message: `Request saved, but generation failed: ${
        generated.message ?? "unknown error"
      } Use Process on the queue to retry.`,
    };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "Something went wrong." };
  }
}
