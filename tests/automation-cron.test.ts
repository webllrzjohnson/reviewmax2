import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getAuthorizedCronSecret,
  parseAutomationCategoryGroups,
  parseAutomationCronConfig,
  pickCronDiscoveryCategory,
} from "@/lib/automation-cron";
import { BALANCED_OUTDOOR_AUTOMATION_CATEGORIES } from "@/lib/automation-category-presets";

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

  it("parses bracketed category groups while keeping ungrouped categories compatible", () => {
    assert.deepEqual(
      parseAutomationCategoryGroups([
        "[Home & DIY]",
        "Cleaning & Floor Care",
        "Tools & DIY",
        "[Camping]",
        "Tents & Shelters",
        "Coolers & Ice Packs",
      ]),
      [
        {
          name: "Home & DIY",
          categories: ["Cleaning & Floor Care", "Tools & DIY"],
        },
        {
          name: "Camping",
          categories: ["Tents & Shelters", "Coolers & Ice Packs"],
        },
      ],
    );

    assert.deepEqual(parseAutomationCategoryGroups(["cat litter", "dog food"]), [
      { name: "General", categories: ["cat litter", "dog food"] },
    ]);
  });

  it("rotates across groups before advancing within each group", () => {
    const categories = [
      "[Home & DIY]",
      "Cleaning & Floor Care",
      "Tools & DIY",
      "[Camping]",
      "Tents & Shelters",
      "Coolers & Ice Packs",
      "[Cycling]",
      "Bike Helmets & Protective Gear",
      "Bike Pumps Tools & Repair Kits",
    ];

    assert.equal(
      pickCronDiscoveryCategory(categories, new Date("2026-01-01T12:00:00Z")),
      "Cleaning & Floor Care",
    );
    assert.equal(
      pickCronDiscoveryCategory(categories, new Date("2026-01-02T12:00:00Z")),
      "Tents & Shelters",
    );
    assert.equal(
      pickCronDiscoveryCategory(categories, new Date("2026-01-03T12:00:00Z")),
      "Bike Helmets & Protective Gear",
    );
    assert.equal(
      pickCronDiscoveryCategory(categories, new Date("2026-01-04T12:00:00Z")),
      "Tools & DIY",
    );
  });

  it("keeps the balanced preset comprehensive across major outdoor groups", () => {
    const groups = parseAutomationCategoryGroups([
      ...BALANCED_OUTDOOR_AUTOMATION_CATEGORIES,
    ]);

    assert.deepEqual(
      groups.map((group) => group.name),
      [
        "Home & Property",
        "Camping & Campsite",
        "Cycling & Biking",
        "Hiking & Trail",
        "Water & Beach",
        "Outdoor Apparel",
        "Outdoor Hobbies & Adventure",
      ],
    );
    assert.ok(groups.flatMap((group) => group.categories).includes("Tents & Shelters"));
    assert.ok(groups.flatMap((group) => group.categories).includes("Ropes Cordage & Tie-Downs"));
    assert.ok(groups.flatMap((group) => group.categories).includes("Coolers & Ice Packs"));
    assert.ok(groups.flatMap((group) => group.categories).includes("Mountain Biking"));
    assert.ok(groups.flatMap((group) => group.categories).includes("Surfboards & Bodyboards"));
    assert.ok(groups.flatMap((group) => group.categories).includes("Hiking Apparel"));
  });

  it("extracts bearer tokens from authorization headers", () => {
    assert.equal(getAuthorizedCronSecret("Bearer abc123"), "abc123");
    assert.equal(getAuthorizedCronSecret("bearer abc123"), "abc123");
    assert.equal(getAuthorizedCronSecret("Token abc123"), null);
  });
});
