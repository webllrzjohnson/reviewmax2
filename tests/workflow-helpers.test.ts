import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { parseJsonLoose } from "../lib/parse-json";
import { pickBoardId } from "../lib/pinterest";
import { dedupeSerpResultsByBrand } from "../lib/serp-products";

describe("parseJsonLoose", () => {
  it("parses valid JSON", () => {
    assert.deepEqual(parseJsonLoose('{"title":"A"}'), { title: "A" });
  });

  it("extracts JSON from prose wrappers", () => {
    assert.deepEqual(parseJsonLoose('Here you go:\n{"rating":4.5}'), {
      rating: 4.5,
    });
  });

  it("returns undefined for non-JSON text", () => {
    assert.equal(parseJsonLoose("not json at all"), undefined);
  });
});

describe("pickBoardId", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it("routes hair categories to PINTEREST_BOARD_HAIR", () => {
    process.env.PINTEREST_BOARD_HAIR = "hair-board";
    assert.equal(pickBoardId("hair-care"), "hair-board");
  });

  it("routes beauty categories to PINTEREST_BOARD_BEAUTY", () => {
    process.env.PINTEREST_BOARD_BEAUTY = "beauty-board";
    assert.equal(pickBoardId("luxury-skincare"), "beauty-board");
  });

  it("falls back to PINTEREST_DEFAULT_BOARD_ID", () => {
    process.env.PINTEREST_DEFAULT_BOARD_ID = "default-board";
    assert.equal(pickBoardId("kitchen-gadgets"), "default-board");
  });

  it("returns null when no board env vars are set", () => {
    delete process.env.PINTEREST_BOARD_HAIR;
    delete process.env.PINTEREST_BOARD_BEAUTY;
    delete process.env.PINTEREST_BOARD_SKIN;
    delete process.env.PINTEREST_DEFAULT_BOARD_ID;
    assert.equal(pickBoardId("anything"), null);
  });
});

describe("dedupeSerpResultsByBrand", () => {
  it("keeps first item per brand and respects limit", () => {
    const items = [
      { title: "Acme Widget Pro", brand: "Acme" },
      { title: "Acme Widget Lite", brand: "Acme" },
      { title: "Beta Thing", brand: "Beta" },
      { title: "Gamma Tool", brand: "Gamma" },
    ];
    const result = dedupeSerpResultsByBrand(items, 2);
    assert.equal(result.length, 2);
    assert.equal(result[0].brand, "Acme");
    assert.equal(result[1].brand, "Beta");
  });

  it("derives brand from title when brand field is missing", () => {
    const items = [
      { title: "Super Brand Ultra" },
      { title: "Super Brand Mini" },
      { title: "Other Product" },
    ];
    const result = dedupeSerpResultsByBrand(items, 6);
    assert.equal(result.length, 2);
    assert.equal(result[0].title, "Super Brand Ultra");
    assert.equal(result[1].title, "Other Product");
  });
});
