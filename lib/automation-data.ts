import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { automationRunItems, automationRuns } from "@/lib/db/schema";
import type {
  AutomationItemStatus,
  AutomationRunStatus,
  AutomationRunType,
} from "@/lib/automation";

export type AutomationRunItemView = {
  id: string;
  productName: string;
  amazonUrl: string | null;
  status: AutomationItemStatus;
  postSlug: string | null;
  message: string | null;
  createdAt: string;
};

export type AutomationRunView = {
  id: string;
  type: AutomationRunType;
  status: AutomationRunStatus;
  category: string;
  country: string;
  maxItems: number;
  summary: string | null;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
  items: AutomationRunItemView[];
};

export async function getRecentAutomationRuns(limit = 10): Promise<AutomationRunView[]> {
  await requireAdmin();

  const runs = await db
    .select()
    .from(automationRuns)
    .orderBy(desc(automationRuns.startedAt))
    .limit(limit);

  return Promise.all(
    runs.map(async (run) => {
      const items = await db
        .select()
        .from(automationRunItems)
        .where(eq(automationRunItems.runId, run.id))
        .orderBy(desc(automationRunItems.createdAt));

      return {
        id: run.id,
        type: run.type,
        status: run.status,
        category: run.category,
        country: run.country,
        maxItems: run.maxItems,
        summary: run.summary,
        error: run.error,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
        items: items.map((item) => ({
          id: item.id,
          productName: item.productName,
          amazonUrl: item.amazonUrl,
          status: item.status,
          postSlug: item.postSlug,
          message: item.message,
          createdAt: item.createdAt,
        })),
      };
    }),
  );
}
