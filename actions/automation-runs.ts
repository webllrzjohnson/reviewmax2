"use server";

import { and, lte, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { automationRuns } from "@/lib/db/schema";
import { AUTOMATION_STALE_RUN_MINUTES } from "@/lib/automation";

export async function markStaleAutomationRunsFailedAction(): Promise<void> {
  await requireAdmin();

  const cutoff = new Date(
    Date.now() - AUTOMATION_STALE_RUN_MINUTES * 60 * 1000,
  ).toISOString();

  await db
    .update(automationRuns)
    .set({
      status: "failed",
      error: `Run did not finish within ${AUTOMATION_STALE_RUN_MINUTES} minutes. Marked failed by admin cleanup.`,
      summary: "Run did not finish and was marked failed after timeout.",
      finishedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(automationRuns.status, "running"),
        lte(automationRuns.startedAt, cutoff),
      ),
    );

  revalidatePath("/dashboard/automation");
}
