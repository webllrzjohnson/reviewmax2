import { normalizeAutomationMaxItems, type AutomationRunStatus } from "@/lib/automation";
import type { DiscoverItemResult } from "@/actions/discover-products";

export const AUTOMATION_SETTINGS_ID = "default";

export type AutomationSettingsInput = {
  enabled: boolean;
  categories: string[];
  country: string;
  notificationEmail: string | null;
  notifyOnRun: boolean;
  monthlySummaryEnabled: boolean;
};

export type AutomationSettingsConfig = AutomationSettingsInput & {
  maxItems: number;
};

type EnvLike = Record<string, string | undefined>;

export function normalizeAutomationCategories(input: string | string[]): string[] {
  const raw = Array.isArray(input) ? input : input.split(/[\n,]/);
  const seen = new Set<string>();
  const categories: string[] = [];

  for (const value of raw) {
    const category = value.trim().replace(/\s+/g, " ");
    if (!category) continue;
    if (/^\[[^\]]+]$/.test(category)) {
      categories.push(category);
      continue;
    }
    const key = category.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    categories.push(category);
  }

  return categories;
}

export function mergeAutomationSettingsWithEnv(
  settings: AutomationSettingsInput | null,
  env: EnvLike,
): AutomationSettingsConfig {
  const envCategories = normalizeAutomationCategories(
    env.AUTOMATION_DISCOVERY_CATEGORIES ?? "",
  );

  return {
    enabled: settings?.enabled ?? true,
    categories: settings?.categories?.length ? settings.categories : envCategories,
    country: settings?.country?.trim() || env.AUTOMATION_DISCOVERY_COUNTRY?.trim() || "United States",
    maxItems: normalizeAutomationMaxItems(env.AUTOMATION_MAX_DRAFTS_PER_RUN ?? 1),
    notificationEmail:
      settings?.notificationEmail?.trim() || env.AUTOMATION_NOTIFICATION_EMAIL?.trim() || null,
    notifyOnRun: settings?.notifyOnRun ?? false,
    monthlySummaryEnabled: settings?.monthlySummaryEnabled ?? false,
  };
}

export type MonthlyAutomationSummaryInput = {
  status: AutomationRunStatus;
  summary: string | null;
};

export function buildMonthlyAutomationSummary(runs: MonthlyAutomationSummaryInput[]) {
  return runs.reduce(
    (summary, run) => {
      summary.runs++;
      if (run.status === "success") summary.successfulRuns++;
      if (run.status === "partial") summary.partialRuns++;
      if (run.status === "failed") summary.failedRuns++;

      const text = run.summary ?? "";
      summary.generated += Number(text.match(/Generated (\d+) draft/)?.[1] ?? 0);
      summary.skipped += Number(text.match(/skipped (\d+) duplicate/)?.[1] ?? 0);
      summary.failedItems += Number(text.match(/failed (\d+) item/)?.[1] ?? 0);

      return summary;
    },
    {
      runs: 0,
      successfulRuns: 0,
      partialRuns: 0,
      failedRuns: 0,
      generated: 0,
      skipped: 0,
      failedItems: 0,
    },
  );
}

export function buildAutomationRunEmailHtml(params: {
  category: string;
  country: string;
  status: string;
  message?: string;
  results?: DiscoverItemResult[];
  dashboardUrl: string;
}) {
  const results = params.results ?? [];
  const items = results.length
    ? results
        .map(
          (result) =>
            `<li><strong>${escapeHtml(result.name)}</strong> — ${result.ok ? "generated" : "failed"}${
              result.slug ? ` (${escapeHtml(result.slug)})` : ""
            }</li>`,
        )
        .join("")
    : "<li>No generated draft results returned.</li>";

  return `<div style="font-family:sans-serif;max-width:640px;margin:0 auto;padding:24px">
  <h1 style="font-size:22px;margin:0 0 8px">Verdict automation run ${escapeHtml(params.status)}</h1>
  <p style="margin:0 0 16px;color:#52525b">${escapeHtml(params.category)} · ${escapeHtml(params.country)}</p>
  <p style="font-size:16px;line-height:1.5">${escapeHtml(params.message ?? "Automation run completed.")}</p>
  <ul style="line-height:1.6">${items}</ul>
  <p><a href="${params.dashboardUrl}">Open automation dashboard</a></p>
</div>`;
}

export function buildMonthlyAutomationSummaryEmailHtml(params: {
  label: string;
  summary: ReturnType<typeof buildMonthlyAutomationSummary>;
  dashboardUrl: string;
}) {
  const { summary } = params;
  return `<div style="font-family:sans-serif;max-width:640px;margin:0 auto;padding:24px">
  <h1 style="font-size:22px;margin:0 0 8px">Verdict automation summary — ${escapeHtml(params.label)}</h1>
  <ul style="line-height:1.7">
    <li>Total runs: ${summary.runs}</li>
    <li>Successful runs: ${summary.successfulRuns}</li>
    <li>Partial runs: ${summary.partialRuns}</li>
    <li>Failed runs: ${summary.failedRuns}</li>
    <li>Drafts generated: ${summary.generated}</li>
    <li>Duplicates skipped: ${summary.skipped}</li>
    <li>Failed items: ${summary.failedItems}</li>
  </ul>
  <p><a href="${params.dashboardUrl}">Open automation dashboard</a></p>
</div>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
