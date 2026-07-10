import { NextResponse } from "next/server";
import { sendMonthlyAutomationSummaryEmail } from "@/actions/automation-runs";
import { getAutomationSettingsConfig } from "@/lib/automation-data";
import { isCronAuthorized } from "@/lib/automation-cron";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isCronAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const settings = await getAutomationSettingsConfig();
  if (!settings.enabled || !settings.monthlySummaryEnabled) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      message: "Monthly automation summary is disabled.",
    });
  }

  const result = await sendMonthlyAutomationSummaryEmail();
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
