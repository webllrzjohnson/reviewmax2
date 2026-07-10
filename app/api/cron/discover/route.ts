import { NextResponse } from "next/server";
import { discoverAndEnqueueAction } from "@/actions/discover-products";
import { getAutomationSettingsConfig } from "@/lib/automation-data";
import {
  buildAutomationRunEmailHtml,
} from "@/lib/automation-settings";
import {
  isCronAuthorized,
  pickCronDiscoveryCategory,
} from "@/lib/automation-cron";
import { getResendClient, resendFromAddress } from "@/lib/resend";
import { siteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isCronAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const config = await getAutomationSettingsConfig();
  if (!config.enabled) {
    return NextResponse.json({ ok: true, skipped: true, message: "Automation is paused." });
  }

  const category = pickCronDiscoveryCategory(config.categories);

  if (!category) {
    return NextResponse.json(
      {
        ok: false,
        message: "No automation categories are configured.",
      },
      { status: 400 },
    );
  }

  const result = await discoverAndEnqueueAction({
    category,
    country: config.country,
    maxItems: config.maxItems,
    source: "cron",
  });

  if (config.notifyOnRun && config.notificationEmail) {
    const resend = getResendClient();
    if (resend) {
      await resend.emails
        .send({
          from: resendFromAddress(),
          to: config.notificationEmail,
          subject: `Verdict automation ${result.ok ? "completed" : "failed"} — ${category}`,
          html: buildAutomationRunEmailHtml({
            category,
            country: config.country,
            status: result.ok ? "completed" : "failed",
            message: result.message,
            results: result.results,
            dashboardUrl: `${siteUrl()}/dashboard/automation`,
          }),
        })
        .catch((error) => console.error("automation notification failed", error));
    }
  }

  return NextResponse.json({
    ok: result.ok,
    category,
    country: config.country,
    maxItems: config.maxItems,
    message: result.message,
    skipped: result.skipped,
    results: result.results,
  });
}
