import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { slugifyTitle, withAmazonAffiliateTag } from "../lib/utils";

describe("withAmazonAffiliateTag", () => {
  it("returns the original url when no tracking id is provided", () => {
    const url = "https://amazon.com/dp/B000?foo=bar";
    assert.equal(withAmazonAffiliateTag(url, undefined), url);
    assert.equal(withAmazonAffiliateTag(url, "   "), url);
  });

  it("appends the tag to amazon urls missing one", () => {
    const result = withAmazonAffiliateTag(
      "https://www.amazon.com/dp/B000",
      "mystore-20",
    );
    assert.equal(new URL(result).searchParams.get("tag"), "mystore-20");
  });

  it("does not overwrite an existing tag", () => {
    const result = withAmazonAffiliateTag(
      "https://amazon.com/dp/B000?tag=existing-20",
      "mystore-20",
    );
    assert.equal(new URL(result).searchParams.get("tag"), "existing-20");
  });

  it("leaves non-amazon hosts untouched", () => {
    const url = "https://example.com/product/1";
    assert.equal(withAmazonAffiliateTag(url, "mystore-20"), url);
  });

  it("returns the input unchanged when the url is invalid", () => {
    const url = "not a url";
    assert.equal(withAmazonAffiliateTag(url, "mystore-20"), url);
  });
});

describe("slugifyTitle", () => {
  it("lowercases and hyphenates", () => {
    assert.equal(slugifyTitle("Best Air Fryer 2026"), "best-air-fryer-2026");
  });

  it("collapses non-alphanumeric runs and trims edge hyphens", () => {
    assert.equal(slugifyTitle("  Hello -- World!!  "), "hello-world");
  });

  it("caps the slug at 200 characters", () => {
    assert.equal(slugifyTitle("a".repeat(250)).length, 200);
  });
});
