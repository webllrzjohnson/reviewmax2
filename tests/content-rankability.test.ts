import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deriveBrand, parsePrice } from "../lib/product-meta";
import {
  buildPublishChecklist,
  checkPublishQuality,
  firstBlockingChecklistIssue,
} from "../lib/post-quality";
import { buildReviewJsonLd } from "../lib/review-schema";
import {
  buildComparePairs,
  canonicalPair,
  parsePair,
} from "../lib/compare-pairs";
import { getAuthorForPost, getAuthorBySlug } from "../lib/authors";

describe("parsePrice", () => {
  it("parses a dollar amount", () => {
    assert.deepEqual(parsePrice("$129.99"), {
      price: "129.99",
      priceCurrency: "USD",
    });
  });

  it("maps currency symbols", () => {
    assert.equal(parsePrice("£49")?.priceCurrency, "GBP");
    assert.equal(parsePrice("€19,99")?.priceCurrency, "EUR");
  });

  it("treats a comma as a decimal mark when no dot is present", () => {
    assert.equal(parsePrice("€19,99")?.price, "19.99");
  });

  it("strips thousands separators when a dot decimal exists", () => {
    assert.equal(parsePrice("$1,299.00")?.price, "1299");
  });

  it("defaults a bare number to USD", () => {
    assert.deepEqual(parsePrice("89"), { price: "89", priceCurrency: "USD" });
  });

  it("returns null when there is no number", () => {
    assert.equal(parsePrice("call for price"), null);
    assert.equal(parsePrice(null), null);
  });
});

describe("deriveBrand", () => {
  it("uses the leading title token", () => {
    assert.equal(deriveBrand("Anker PowerCore 10000"), "Anker");
  });

  it("returns null for numeric or too-short leads", () => {
    assert.equal(deriveBrand("10000mAh Power Bank"), null);
    assert.equal(deriveBrand("A Great Thing"), null);
  });

  it("returns null for empty input", () => {
    assert.equal(deriveBrand(""), null);
  });
});

describe("checkPublishQuality", () => {
  const longBody = "x".repeat(400);

  it("passes with enough body and at least one FAQ", () => {
    assert.equal(
      checkPublishQuality({
        body: longBody,
        faqs: [{ q: "Is it good?", a: "Yes." }],
        specs: {},
      }),
      null,
    );
  });

  it("passes with enough body and at least one spec", () => {
    assert.equal(
      checkPublishQuality({
        body: longBody,
        faqs: [],
        specs: { Weight: "1kg" },
      }),
      null,
    );
  });

  it("blocks a too-short body", () => {
    const msg = checkPublishQuality({
      body: "too short",
      faqs: [{ q: "q", a: "a" }],
      specs: {},
    });
    assert.ok(msg && msg.includes("body"));
  });

  it("blocks when both FAQs and specs are missing", () => {
    const msg = checkPublishQuality({ body: longBody, faqs: [], specs: {} });
    assert.ok(msg && msg.includes("FAQ"));
  });

  it("builds a publishing checklist for review quality, SEO, affiliate, and media readiness", () => {
    const checklist = buildPublishChecklist({
      title: "Best Cat Litter Box Review",
      excerpt: "A practical summary for shoppers comparing litter boxes.",
      body: `${longBody} This review includes an alternative section and buying advice.`,
      categoryId: "cat-litter",
      rating: 4.4,
      pros: ["Controls odor"],
      cons: ["Large footprint"],
      verdict: "A strong pick for apartments.",
      amazonUrl: "https://www.amazon.ca/dp/B000000000",
      imageUrl: "https://example.com/product.jpg",
      faqs: [{ q: "Is it easy to clean?", a: "Yes." }],
      specs: { Material: "Plastic" },
    });

    assert.equal(checklist.every((item) => item.ok), true);
    assert.deepEqual(checklist.map((item) => item.id), [
      "title",
      "excerpt",
      "body-depth",
      "category",
      "rating",
      "pros-cons",
      "verdict",
      "affiliate-link",
      "image",
      "rich-results",
      "no-placeholders",
    ]);
  });

  it("flags drafts that are not ready to publish", () => {
    const checklist = buildPublishChecklist({
      title: "TODO",
      excerpt: "",
      body: "As an AI language model, placeholder text.",
      categoryId: "",
      rating: null,
      pros: [],
      cons: [],
      verdict: "",
      amazonUrl: "",
      imageUrl: null,
      faqs: [],
      specs: {},
    });

    const failed = checklist.filter((item) => !item.ok).map((item) => item.id);
    assert.ok(failed.includes("affiliate-link"));
    assert.ok(failed.includes("image"));
    assert.ok(failed.includes("no-placeholders"));
  });

  it("returns the first blocking issue for full publish gates", () => {
    const issue = firstBlockingChecklistIssue({
      title: "Best Cat Litter Box Review",
      excerpt: "A practical summary for shoppers comparing litter boxes.",
      body: longBody,
      categoryId: "cat-litter",
      rating: 4.4,
      pros: ["Controls odor"],
      cons: ["Large footprint"],
      verdict: "A strong pick for apartments.",
      amazonUrl: "",
      imageUrl: null,
      faqs: [{ q: "Is it easy to clean?", a: "Yes." }],
      specs: { Material: "Plastic" },
    });

    assert.equal(
      issue,
      "Affiliate/product link present: Add a valid Amazon/product URL before publishing.",
    );
  });
});

describe("review structured data", () => {
  const post = {
    title: "Anker Widget Review",
    slug: "anker-widget-review",
    excerpt: "A practical product review for comparison shoppers.",
    verdict: "A reliable choice for most shoppers.",
    amazon_url: "https://www.amazon.ca/dp/B000000000",
    image_url: "https://example.com/widget.jpg",
    rating: 4.6,
    price_at_review: "$49.99",
    published_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
    specs: { Material: "Plastic" },
    faqs: [{ q: "Is it portable?", a: "Yes." }],
    category: {
      id: "cat-1",
      name: "Widgets",
      slug: "widgets",
      description: null,
      created_at: "2026-01-01T00:00:00.000Z",
    },
  };

  it("builds product, article, FAQ, and breadcrumb JSON-LD", () => {
    const nodes = buildReviewJsonLd(post, "https://verdict.example");

    assert.deepEqual(nodes.map((node) => node["@type"]), [
      "Product",
      "Article",
      "FAQPage",
      "BreadcrumbList",
    ]);
    const product = nodes[0] as {
      review: { reviewRating: { ratingValue: number } };
      offers: { price: string };
    };
    const faq = nodes[2] as { mainEntity: Array<{ name: string }> };
    const breadcrumb = nodes[3] as {
      itemListElement: Array<{ item: string }>;
    };

    assert.equal(product.review.reviewRating.ratingValue, 4.6);
    assert.equal(product.offers.price, "49.99");
    assert.equal(faq.mainEntity[0].name, "Is it portable?");
    assert.equal(
      breadcrumb.itemListElement.at(-1)?.item,
      "https://verdict.example/blog/anker-widget-review",
    );
  });

  it("omits FAQPage when there are no FAQs", () => {
    const nodes = buildReviewJsonLd({ ...post, faqs: [] }, "https://verdict.example");

    assert.equal(nodes.some((node) => node["@type"] === "FAQPage"), false);
  });
});

describe("compare pairs", () => {
  it("orders slugs canonically", () => {
    assert.equal(canonicalPair("beta", "alpha"), "alpha-vs-beta");
    assert.equal(canonicalPair("alpha", "beta"), "alpha-vs-beta");
  });

  it("parses a pair segment", () => {
    assert.deepEqual(parsePair("alpha-vs-beta"), {
      left: "alpha",
      right: "beta",
    });
  });

  it("rejects malformed or self pairs", () => {
    assert.equal(parsePair("alpha"), null);
    assert.equal(parsePair("-vs-beta"), null);
    assert.equal(parsePair("same-vs-same"), null);
  });

  it("builds unique within-category pairs and dedupes reversed order", () => {
    const pairs = buildComparePairs([
      { slug: "a", category_id: "c1" },
      { slug: "b", category_id: "c1" },
      { slug: "c", category_id: "c2" },
    ]);
    assert.deepEqual(pairs.sort(), ["a-vs-b"]);
  });

  it("respects the max cap", () => {
    const posts = ["a", "b", "c", "d"].map((slug) => ({
      slug,
      category_id: "c1",
    }));
    assert.equal(buildComparePairs(posts, { max: 2 }).length, 2);
  });
});

describe("authors", () => {
  it("assigns the same author for the same slug", () => {
    const a = getAuthorForPost({ slug: "some-product-review" });
    const b = getAuthorForPost({ slug: "some-product-review" });
    assert.equal(a.slug, b.slug);
  });

  it("resolves a known author by slug", () => {
    const author = getAuthorForPost({ slug: "x" });
    assert.ok(getAuthorBySlug(author.slug));
  });

  it("returns undefined for an unknown author slug", () => {
    assert.equal(getAuthorBySlug("nobody"), undefined);
  });
});
