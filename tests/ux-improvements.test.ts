import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getFeaturedCategories,
  getReviewSummaryBullets,
  POPULAR_SEARCH_SUGGESTIONS,
  TRUST_SIGNALS,
} from "../lib/ux-improvements";
import type { CategoryWithPostCount, PostWithCategory } from "../types";

const categories: CategoryWithPostCount[] = [
  { id: "1", name: "Tiny", slug: "tiny", description: null, created_at: "", post_count: 1 },
  { id: "2", name: "Popular", slug: "popular", description: null, created_at: "", post_count: 10 },
  { id: "3", name: "Medium", slug: "medium", description: null, created_at: "", post_count: 5 },
  { id: "4", name: "Also Popular", slug: "also-popular", description: null, created_at: "", post_count: 10 },
];

const basePost: PostWithCategory = {
  id: "p1",
  title: "Example Product Review",
  slug: "example-product-review",
  excerpt: "A helpful review excerpt.",
  body: "",
  category_id: "c1",
  rating: 4.6,
  pros: ["Excellent battery life", "Accurate GPS", "Bright display", "Durable build"],
  cons: ["Expensive", "Overkill for casual users", "Large case"],
  verdict: "A premium pick for serious outdoor users.",
  amazon_url: "https://amazon.example/product",
  image_url: null,
  gallery_urls: [],
  badge: null,
  faqs: [],
  price_at_review: "$999",
  specs: {},
  is_published: true,
  published_at: "2026-01-01T00:00:00.000Z",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  category: { id: "c1", name: "Fitness Gear", slug: "fitness-gear", description: null, created_at: "" },
};

describe("ux improvement helpers", () => {
  it("keeps homepage category browsing focused on the strongest categories", () => {
    assert.deepEqual(
      getFeaturedCategories(categories, 3).map((c) => c.name),
      ["Also Popular", "Popular", "Medium"],
    );
  });

  it("exposes concrete homepage trust signals", () => {
    assert.equal(TRUST_SIGNALS.length, 4);
    assert.ok(TRUST_SIGNALS.some((signal) => signal.includes("Affiliate")));
  });

  it("exposes useful search suggestions before the user types", () => {
    assert.ok(POPULAR_SEARCH_SUGGESTIONS.includes("Vitamin C serum"));
    assert.ok(POPULAR_SEARCH_SUGGESTIONS.length >= 6);
  });

  it("limits review summary bullets to scannable pros and cons", () => {
    const summary = getReviewSummaryBullets(basePost);

    assert.deepEqual(summary.pros, ["Excellent battery life", "Accurate GPS", "Bright display"]);
    assert.deepEqual(summary.cons, ["Expensive", "Overkill for casual users", "Large case"]);
    assert.equal(summary.bestFor, "Fitness Gear shoppers who want a top-rated option and can justify the premium.");
  });
});
