import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildReviewSummary } from "@/lib/review-summary";

describe("buildReviewSummary", () => {
  it("turns an indoor smart camera review into shopper-focused summary tiles", () => {
    const summary = buildReviewSummary({
      title:
        "TP-Link Tapo C200 Smart Pan/Tilt Camera Review: Affordable Home Monitoring That Delivers",
      category: { name: "Smart Home", slug: "smart-home" },
      pros: ["No mandatory cloud subscription — local microSD storage up to 128 GB"],
      cons: ["2.4 GHz WiFi only — no 5 GHz support"],
      body:
        "Baby monitoring, pet watching, 1080p video, motion tracking, indoor use only, no HomeKit.",
      rating: "4.3",
    });

    assert.match(summary.bestFor, /parents/i);
    assert.match(summary.bestFor, /pet owners/i);
    assert.match(summary.bestFor, /cloud fees/i);
    assert.match(summary.skipIf, /outdoor/i);
    assert.match(summary.skipIf, /5 GHz/i);
    assert.equal(summary.standOut, "No mandatory cloud subscription — local microSD storage up to 128 GB");
    assert.equal(summary.scoreSnapshot, "4.3/5 Verdict score");
  });

  it("falls back to category and content when no product-specific pattern matches", () => {
    const summary = buildReviewSummary({
      title: "Generic Product Review",
      category: { name: "Kitchen Gadgets", slug: "kitchen-gadgets" },
      pros: ["Compact and easy to store"],
      cons: ["Too small for large households"],
      rating: 4,
    });

    assert.match(summary.bestFor, /kitchen gadgets/i);
    assert.equal(summary.skipIf, "Too small for large households");
    assert.equal(summary.standOut, "Compact and easy to store");
    assert.equal(summary.scoreSnapshot, "4/5 Verdict score");
  });
});
