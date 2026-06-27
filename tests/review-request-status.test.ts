import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getReviewRequestStatus } from "../lib/review-request-status";
import type { ReviewRequest } from "../types";

function baseRequest(overrides: Partial<ReviewRequest> = {}): ReviewRequest {
  return {
    id: "1",
    product_name: "Test",
    category_slug: "tech",
    amazon_url: "https://amazon.com/dp/1",
    notes: null,
    created_by: null,
    processed_at: null,
    processed_by: null,
    process_error: null,
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("getReviewRequestStatus", () => {
  it("returns processed when processed_at is set", () => {
    assert.equal(
      getReviewRequestStatus(
        baseRequest({ processed_at: "2026-01-02T00:00:00.000Z" }),
      ),
      "processed",
    );
  });

  it("returns failed when process_error is set and not processed", () => {
    assert.equal(
      getReviewRequestStatus(baseRequest({ process_error: "Generation failed." })),
      "failed",
    );
  });

  it("returns pending otherwise", () => {
    assert.equal(getReviewRequestStatus(baseRequest()), "pending");
  });
});
