export const AUTOMATION_MAX_ITEMS_PER_RUN = 6;

export const AUTOMATION_RUN_TYPES = ["product_discovery"] as const;
export const AUTOMATION_RUN_STATUSES = ["running", "success", "failed", "partial"] as const;
export const AUTOMATION_ITEM_STATUSES = ["generated", "skipped", "failed"] as const;

export type AutomationRunType = (typeof AUTOMATION_RUN_TYPES)[number];
export type AutomationRunStatus = (typeof AUTOMATION_RUN_STATUSES)[number];
export type AutomationItemStatus = (typeof AUTOMATION_ITEM_STATUSES)[number];

export type AutomationSummaryItem = { status: AutomationItemStatus };

export function normalizeAutomationSearchTerm(input: string): {
  label: string;
  slug: string;
} {
  const label = input.trim().replace(/\s+/g, " ");
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");

  return { label, slug: slug || "product-discovery" };
}

export function normalizeAutomationMaxItems(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return 3;
  return Math.min(Math.max(Math.trunc(parsed), 1), AUTOMATION_MAX_ITEMS_PER_RUN);
}

export function buildAutomationSummary(items: AutomationSummaryItem[]): string {
  const generated = items.filter((item) => item.status === "generated").length;
  const skipped = items.filter((item) => item.status === "skipped").length;
  const failed = items.filter((item) => item.status === "failed").length;

  const parts = [
    `${generated} draft${generated === 1 ? "" : "s"}`,
    `${skipped} duplicate${skipped === 1 ? "" : "s"}`,
    `${failed} item${failed === 1 ? "" : "s"}`,
  ];

  return `Generated ${parts[0]}, skipped ${parts[1]}, failed ${parts[2]}.`;
}

export function getAutomationRunStatus(items: AutomationSummaryItem[]): AutomationRunStatus {
  if (items.length === 0) return "success";
  const failed = items.some((item) => item.status === "failed");
  const generated = items.some((item) => item.status === "generated");
  return failed && generated ? "partial" : failed ? "failed" : "success";
}
