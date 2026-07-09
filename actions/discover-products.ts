"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { automationRunItems, automationRuns, reviewRequests } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { generateAndInsertReview } from "@/actions/generate-review";
import {
  buildAutomationSummary,
  getAutomationRunStatus,
  normalizeAutomationMaxItems,
  normalizeAutomationSearchTerm,
  type AutomationItemStatus,
} from "@/lib/automation";
import {
  discoverProducts,
  filterExistingByAsin,
} from "@/lib/product-discovery";

const DEFAULT_GENERATE_PER_RUN = 3;

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

type AutomationItemDraft = {
  productName: string;
  amazonUrl?: string | null;
  status: AutomationItemStatus;
  postSlug?: string | null;
  message?: string | null;
};

async function finishAutomationRun(params: {
  runId: string;
  items: AutomationItemDraft[];
  error?: string | null;
}) {
  if (params.items.length > 0) {
    await db.insert(automationRunItems).values(
      params.items.map((item) => ({
        runId: params.runId,
        productName: item.productName,
        amazonUrl: item.amazonUrl ?? null,
        status: item.status,
        postSlug: item.postSlug ?? null,
        message: item.message ?? null,
      })),
    );
  }

  const status = params.error
    ? "failed"
    : getAutomationRunStatus(params.items.map((item) => ({ status: item.status })));

  await db
    .update(automationRuns)
    .set({
      status,
      summary: buildAutomationSummary(params.items.map((item) => ({ status: item.status }))),
      error: params.error ?? null,
      finishedAt: new Date().toISOString(),
    })
    .where(eq(automationRuns.id, params.runId));
}

/**
 * Searches a category on Amazon (SerpApi), drops products already reviewed,
 * then generates + saves a draft review for each new product. Mirrors the
 * "Verdict Flow" discovery workflow and records an observable automation run.
 */
export async function discoverAndEnqueueAction(input: {
  category: string;
  country: string;
  maxItems?: number;
  source?: "admin" | "cron";
}): Promise<DiscoverActionState> {
  let session: Awaited<ReturnType<typeof requireAdmin>> | null = null;
  if (input.source !== "cron") {
    try {
      session = await requireAdmin();
    } catch {
      return { ok: false, message: "Your session expired. Sign in again." };
    }
  }

  const category = normalizeAutomationSearchTerm(input.category ?? "");
  const country = input.country?.trim() || "United States";
  const maxItems = normalizeAutomationMaxItems(
    input.maxItems ?? DEFAULT_GENERATE_PER_RUN,
  );

  if (!category.label) {
    return { ok: false, message: "Enter a category to search." };
  }

  const [run] = await db
    .insert(automationRuns)
    .values({
      type: "product_discovery",
      category: category.slug,
      country,
      maxItems,
      startedBy: session?.user.id ?? null,
      metadata: { label: category.label, source: input.source ?? "admin" },
    })
    .returning({ id: automationRuns.id });

  if (!run) {
    return { ok: false, message: "Could not start automation run." };
  }

  const items: AutomationItemDraft[] = [];
  const discovered = await discoverProducts(category.label, country);
  if (!discovered.ok) {
    await finishAutomationRun({
      runId: run.id,
      items,
      error: discovered.message,
    });
    return { ok: false, message: discovered.message };
  }

  const fresh = await filterExistingByAsin(discovered.products);
  const skipped = discovered.products.length - fresh.length;
  const batch = fresh.slice(0, maxItems);
  const deferred = fresh.length - batch.length;

  if (skipped > 0) {
    items.push({
      productName: `${skipped} duplicate product${skipped === 1 ? "" : "s"}`,
      status: "skipped",
      message: "Already reviewed by ASIN.",
    });
  }

  if (batch.length === 0) {
    await finishAutomationRun({ runId: run.id, items });
    return {
      ok: true,
      skipped,
      results: [],
      message: `Found ${discovered.products.length} products, all already reviewed.`,
    };
  }

  const results: DiscoverItemResult[] = [];

  for (const product of batch) {
    let requestId: string | null = null;
    try {
      const [inserted] = await db
        .insert(reviewRequests)
        .values({
          productName: product.name,
          categorySlug: product.category,
          amazonUrl: product.amazon_url,
          notes: null,
          createdBy: session?.user.id ?? null,
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
      trusted: input.source === "cron",
    });

    if (requestId) {
      try {
        await db
          .update(reviewRequests)
          .set(
            generated.ok
              ? {
                  processedAt: new Date().toISOString(),
                  processedBy: session?.user.id ?? null,
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
    items.push({
      productName: product.name,
      amazonUrl: product.amazon_url,
      status: generated.ok ? "generated" : "failed",
      postSlug: generated.slug,
      message: generated.message,
    });
  }

  if (deferred > 0) {
    items.push({
      productName: `${deferred} deferred product${deferred === 1 ? "" : "s"}`,
      status: "skipped",
      message: "Run again to process the next safe batch.",
    });
  }

  await finishAutomationRun({ runId: run.id, items });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/automation");
  revalidatePath("/dashboard/posts");
  revalidatePath("/dashboard/review-requests");

  const created = results.filter((r) => r.ok).length;
  const deferredNote = deferred
    ? ` ${deferred} more new product${deferred === 1 ? "" : "s"} skipped this run — run discovery again to process ${deferred === 1 ? "it" : "them"}.`
    : "";
  return {
    ok: true,
    skipped,
    results,
    message: `Generated ${created} of ${batch.length} new products${
      skipped ? ` (${skipped} skipped as duplicates)` : ""
    }.${deferredNote}`,
  };
}
