import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AUTOMATION_MAX_ITEMS_PER_RUN,
  buildAutomationSummary,
  normalizeAutomationMaxItems,
  normalizeAutomationSearchTerm,
} from "@/lib/automation";

describe("automation helpers", () => {
  it("normalizes search terms into safe category slugs", () => {
    assert.deepEqual(normalizeAutomationSearchTerm("  Vitamin C Serum!! "), {
      label: "Vitamin C Serum!!",
      slug: "vitamin-c-serum",
    });
  });

  it("clamps max items to the safe run limit", () => {
    assert.equal(normalizeAutomationMaxItems(0), 1);
    assert.equal(normalizeAutomationMaxItems(2), 2);
    assert.equal(normalizeAutomationMaxItems(99), AUTOMATION_MAX_ITEMS_PER_RUN);
  });

  it("builds a concise run summary from item statuses", () => {
    assert.equal(
      buildAutomationSummary([
        { status: "generated" },
        { status: "skipped" },
        { status: "failed" },
        { status: "generated" },
      ]),
      "Generated 2 drafts, skipped 1 duplicate, failed 1 item.",
    );
  });
});
