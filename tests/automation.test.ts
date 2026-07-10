import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AUTOMATION_MAX_ITEMS_PER_RUN,
  buildAutomationSummary,
  getAutomationDisplayStatus,
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

  it("labels old unfinished runs as stale for the dashboard", () => {
    const now = new Date("2026-07-10T12:00:00.000Z");

    assert.equal(
      getAutomationDisplayStatus(
        {
          status: "running",
          startedAt: "2026-07-10T11:30:00.000Z",
          finishedAt: null,
        },
        now,
      ),
      "stale",
    );
    assert.equal(
      getAutomationDisplayStatus(
        {
          status: "running",
          startedAt: "2026-07-10T11:55:00.000Z",
          finishedAt: null,
        },
        now,
      ),
      "running",
    );
    assert.equal(
      getAutomationDisplayStatus(
        {
          status: "success",
          startedAt: "2026-07-10T11:30:00.000Z",
          finishedAt: "2026-07-10T11:31:00.000Z",
        },
        now,
      ),
      "success",
    );
  });
});
