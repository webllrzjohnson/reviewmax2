"use server";

import { and, lte, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { automationRuns, automationSettings } from "@/lib/db/schema";
import { AUTOMATION_STALE_RUN_MINUTES } from "@/lib/automation";
import {
  AUTOMATION_SETTINGS_ID,
  buildMonthlyAutomationSummaryEmailHtml,
  normalizeAutomationCategories,
} from "@/lib/automation-settings";
import { getMonthlyAutomationSummary } from "@/lib/automation-data";
import { getResendClient, resendFromAddress } from "@/lib/resend";
import { siteUrl } from "@/lib/utils";

export type AutomationSettingsState = {
  ok: boolean;
  message?: string;
};

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

export async function updateAutomationSettingsAction(
  _prev: AutomationSettingsState,
  formData: FormData,
): Promise<AutomationSettingsState> {
  await requireAdmin();

  const categories = normalizeAutomationCategories(String(formData.get("categories") ?? ""));
  if (categories.length === 0) {
    return { ok: false, message: "Add at least one automation category." };
  }

  const country = String(formData.get("country") ?? "").trim() || "United States";
  const notificationEmail = String(formData.get("notificationEmail") ?? "").trim() || null;

  await db
    .insert(automationSettings)
    .values({
      id: AUTOMATION_SETTINGS_ID,
      enabled: formData.get("enabled") === "on",
      categories,
      country,
      notificationEmail,
      notifyOnRun: formData.get("notifyOnRun") === "on",
      monthlySummaryEnabled: formData.get("monthlySummaryEnabled") === "on",
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: automationSettings.id,
      set: {
        enabled: formData.get("enabled") === "on",
        categories,
        country,
        notificationEmail,
        notifyOnRun: formData.get("notifyOnRun") === "on",
        monthlySummaryEnabled: formData.get("monthlySummaryEnabled") === "on",
        updatedAt: new Date().toISOString(),
      },
    });

  revalidatePath("/dashboard/automation");
  return { ok: true, message: "Automation settings saved." };
}

export async function sendMonthlyAutomationSummaryAction(): Promise<void> {
  await requireAdmin();
  await sendMonthlyAutomationSummaryEmail();
  revalidatePath("/dashboard/automation");
}

export async function sendMonthlyAutomationSummaryEmail(): Promise<AutomationSettingsState> {
  const [settings] = await db
    .select()
    .from(automationSettings)
    .where(eq(automationSettings.id, AUTOMATION_SETTINGS_ID))
    .limit(1);

  const to = settings?.notificationEmail?.trim() || process.env.AUTOMATION_NOTIFICATION_EMAIL?.trim();
  if (!to) return { ok: false, message: "No automation notification email is configured." };

  const resend = getResendClient();
  if (!resend) return { ok: false, message: "RESEND_API_KEY is not configured." };

  const now = new Date();
  const label = now.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const summary = await getMonthlyAutomationSummary(now);
  const base = siteUrl();

  await resend.emails.send({
    from: resendFromAddress(),
    to,
    subject: `Verdict automation summary — ${label}`,
    html: buildMonthlyAutomationSummaryEmailHtml({
      label,
      summary,
      dashboardUrl: `${base}/dashboard/automation`,
    }),
  });

  return { ok: true, message: `Monthly summary sent to ${to}.` };
}
