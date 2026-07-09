import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getAuthorizedCronSecret,
  parseAutomationCronConfig,
  pickCronDiscoveryCategory,
} from "@/lib/automation-cron";

describe("automation cron helpers", () => {
  it("parses configured discovery categories and clamps max drafts", () => {
    const config = parseAutomationCronConfig({
      AUTOMATION_DISCOVERY_CATEGORIES: "cat litter, dog food,, vitamin c serum",
      AUTOMATION_DISCOVERY_COUNTRY: "Canada",
      AUTOMATION_MAX_DRAFTS_PER_RUN: "99",
    });

    assert.deepEqual(config.categories, ["cat litter", "dog food", "vitamin c serum"]);
    assert.equal(config.country, "Canada");
    assert.equal(config.maxItems, 6);
  });

  it("uses safe defaults for country and max drafts", () => {
    const config = parseAutomationCronConfig({
      AUTOMATION_DISCOVERY_CATEGORIES: "cat litter",
    });

    assert.equal(config.country, "United States");
    assert.equal(config.maxItems, 1);
  });

  it("picks a stable category based on the current UTC date", () => {
    assert.equal(
      pickCronDiscoveryCategory(["cat litter", "dog food", "sunscreen"], new Date("2026-07-06T12:00:00Z")),
      "cat litter",
    );
    assert.equal(
      pickCronDiscoveryCategory(["cat litter", "dog food", "sunscreen"], new Date("2026-07-07T12:00:00Z")),
      "dog food",
    );
  });

  it("extracts bearer tokens from authorization headers", () => {
    assert.equal(getAuthorizedCronSecret("Bearer abc123"), "abc123");
    assert.equal(getAuthorizedCronSecret("bearer abc123"), "abc123");
    assert.equal(getAuthorizedCronSecret("Token abc123"), null);
  });
});
