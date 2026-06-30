import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  GeneratedReviewSchema,
  normalizeGeneratedReviewJson,
} from "@/lib/generate-review";

describe("normalizeGeneratedReviewJson", () => {
  it("coerces string rating and newline-separated pros/cons", () => {
    const normalized = normalizeGeneratedReviewJson({
      title: "Test Product Review",
      excerpt: "Short summary.",
      body: "Long body ".repeat(50),
      rating: "4.5",
      pros: "- Fast setup\n- Good battery",
      cons: "Heavy\n- Pricey",
      verdict: "Worth it for most buyers.",
      faqs: [],
      specs: {},
    });

    const result = GeneratedReviewSchema.safeParse(normalized);
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.rating, 4.5);
      assert.deepEqual(result.data.pros, ["Fast setup", "Good battery"]);
      assert.deepEqual(result.data.cons, ["Heavy", "Pricey"]);
    }
  });
});
