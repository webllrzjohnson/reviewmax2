import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deriveBrand, parsePrice } from "../lib/product-meta";
import { checkPublishQuality } from "../lib/post-quality";
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
