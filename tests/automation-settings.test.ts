import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAutomationRunEmailHtml,
  buildMonthlyAutomationSummary,
  mergeAutomationSettingsWithEnv,
  normalizeAutomationCategories,
} from "@/lib/automation-settings";

describe("automation settings helpers", () => {
  it("normalizes category settings into a clean unique list", () => {
    assert.deepEqual(
      normalizeAutomationCategories(" cat litter\nDog Food\ncat litter\n\nvitamin c serum "),
      ["cat litter", "Dog Food", "vitamin c serum"],
    );
  });

  it("preserves category group headers while normalizing and deduplicating products", () => {
    assert.deepEqual(
      normalizeAutomationCategories(
        "[Camping]\nTents & Shelters\nCoolers & Ice Packs\nTents & Shelters",
      ),
      ["[Camping]", "Tents & Shelters", "Coolers & Ice Packs"],
    );
  });

  it("merges saved settings over environment defaults without changing max draft settings", () => {
    const config = mergeAutomationSettingsWithEnv(
      {
        enabled: false,
        categories: ["cat litter", "dog food"],
        country: "Canada",
        notificationEmail: "admin@example.com",
        notifyOnRun: true,
        monthlySummaryEnabled: true,
      },
      {
        AUTOMATION_DISCOVERY_CATEGORIES: "sunscreen",
        AUTOMATION_DISCOVERY_COUNTRY: "United States",
        AUTOMATION_MAX_DRAFTS_PER_RUN: "1",
      },
    );

    assert.equal(config.enabled, false);
    assert.deepEqual(config.categories, ["cat litter", "dog food"]);
    assert.equal(config.country, "Canada");
    assert.equal(config.maxItems, 1);
    assert.equal(config.notificationEmail, "admin@example.com");
    assert.equal(config.notifyOnRun, true);
  });

  it("summarizes monthly automation results", () => {
    const summary = buildMonthlyAutomationSummary([
      { status: "success", summary: "Generated 1 draft, skipped 2 duplicates, failed 0 items." },
      { status: "partial", summary: "Generated 1 draft, skipped 0 duplicates, failed 1 item." },
      { status: "failed", summary: null },
    ]);

    assert.equal(summary.runs, 3);
    assert.equal(summary.generated, 2);
    assert.equal(summary.skipped, 2);
    assert.equal(summary.failedItems, 1);
    assert.equal(summary.failedRuns, 1);
  });

  it("renders a run notification email", () => {
    const html = buildAutomationRunEmailHtml({
      category: "cat litter",
      country: "Canada",
      status: "success",
      message: "Generated 1 of 1 new products.",
      results: [{ name: "Test Product", ok: true, slug: "test-product" }],
      dashboardUrl: "https://example.com/dashboard/automation",
    });

    assert.match(html, /cat litter/);
    assert.match(html, /Generated 1 of 1/);
    assert.match(html, /Test Product/);
  });
});
