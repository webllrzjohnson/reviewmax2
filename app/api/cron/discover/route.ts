import { NextResponse } from "next/server";
import { discoverAndEnqueueAction } from "@/actions/discover-products";
import {
  isCronAuthorized,
  parseAutomationCronConfig,
  pickCronDiscoveryCategory,
} from "@/lib/automation-cron";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isCronAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const config = parseAutomationCronConfig(process.env);
  const category = pickCronDiscoveryCategory(config.categories);

  if (!category) {
    return NextResponse.json(
      {
        ok: false,
        message: "AUTOMATION_DISCOVERY_CATEGORIES is not configured.",
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
