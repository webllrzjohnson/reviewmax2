"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { reviewRequests } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { expandAmazonProductUrl } from "@/lib/amazon-image";
import { generateAndInsertReview } from "@/actions/generate-review";

export type RequestActionState = { ok: boolean; message?: string };

export async function deleteReviewRequestAction(
  id: string,
): Promise<RequestActionState> {
  try {
    await requireAdmin();
    await db.delete(reviewRequests).where(eq(reviewRequests.id, id));
    revalidatePath("/dashboard/review-requests");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch {
    return { ok: false, message: "Could not delete request." };
  }
}

export async function processReviewRequestAction(
  id: string,
): Promise<RequestActionState> {
  try {
    const session = await requireAdmin();

    const [row] = await db
      .select()
      .from(reviewRequests)
      .where(eq(reviewRequests.id, id))
      .limit(1);

    if (!row) {
      return { ok: false, message: "Request not found." };
    }

    if (row.processedAt) {
      return { ok: false, message: "This request was already processed." };
    }

    const amazonUrl = await expandAmazonProductUrl(row.amazonUrl);
    const notes =
      row.notes != null && row.notes.trim() !== "" ? row.notes.trim() : null;

    const generated = await generateAndInsertReview({
      product_name: row.productName,
      category_slug: row.categorySlug,
      amazon_url: amazonUrl,
      notes,
    });

    if (!generated.ok) {
      await db
        .update(reviewRequests)
        .set({ processError: generated.message ?? "Generation failed." })
        .where(eq(reviewRequests.id, id));

      revalidatePath("/dashboard/review-requests");
      revalidatePath("/dashboard");
      return { ok: false, message: generated.message };
    }

    await db
      .update(reviewRequests)
      .set({
        amazonUrl,
        processedAt: new Date().toISOString(),
        processedBy: session.user.id,
        processError: null,
      })
      .where(eq(reviewRequests.id, id));

    revalidatePath("/dashboard/review-requests");
    revalidatePath("/dashboard");
    return {
      ok: true,
      message: "Review draft generated.",
    };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "Something went wrong." };
  }
}
