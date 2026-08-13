import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { normalizeActionResult } from "../lib/action-result";
import { resolveDatabaseUrl } from "../lib/db/env";
import { parseJsonLoose } from "../lib/parse-json";
import {
  buildPinterestPinPayload,
  buildPinterestPinText,
  formatPinterestPublishMessage,
  formatPostPublishMessage,
  getPinterestThrottleUntil,
  isPinterestSpamBlockMessage,
  parsePinterestPinResponse,
  pickBoardId,
} from "../lib/pinterest";
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

  it("routes outdoor categories to outdoor board env vars", () => {
    process.env.PINTEREST_BOARD_CAMPING = "camping-board";
    process.env.PINTEREST_BOARD_HIKING = "hiking-board";
    process.env.PINTEREST_BOARD_FISHING = "fishing-board";
    process.env.PINTEREST_BOARD_CYCLING = "cycling-board";
    process.env.PINTEREST_BOARD_WATER = "water-board";
    process.env.PINTEREST_BOARD_OUTDOOR_APPAREL = "apparel-board";
    process.env.PINTEREST_BOARD_HOME_TOOLS = "home-tools-board";

    assert.equal(
      pickBoardId("Camping Essentials & Must Haves"),
      "camping-board",
    );
    assert.equal(pickBoardId("Backpacking & Ultralight Gear"), "hiking-board");
    assert.equal(pickBoardId("Fishing & Angling"), "fishing-board");
    assert.equal(pickBoardId("Cycling Apparel"), "cycling-board");
    assert.equal(pickBoardId("Surfboards & Bodyboards"), "water-board");
    assert.equal(pickBoardId("Outdoor Apparel"), "apparel-board");
    assert.equal(pickBoardId("Tools & DIY"), "home-tools-board");
  });

  it("returns null when no board env vars are set", () => {
    delete process.env.PINTEREST_BOARD_HAIR;
    delete process.env.PINTEREST_BOARD_BEAUTY;
    delete process.env.PINTEREST_BOARD_SKIN;
    delete process.env.PINTEREST_DEFAULT_BOARD_ID;
    assert.equal(pickBoardId("anything"), null);
  });
});

describe("buildPinterestPinText", () => {
  it("creates keyword-rich Pinterest text from review details", () => {
    assert.deepEqual(
      buildPinterestPinText({
        title: "Kotap 10-ft x 10-ft General Purpose Blue Poly Tarp Review",
        excerpt:
          "The Kotap TRA-1010 is a budget-friendly 10x10 poly tarp for camping, yard work, and light-duty protection.",
        categorySlug: "Tent Tarp",
      }),
      {
        title: "Kotap 10-ft x 10-ft General Purpose Blue Poly Tarp Review",
        description:
          "Practical Tent Tarp review: The Kotap TRA-1010 is a budget-friendly 10x10 poly tarp for camping, yard work, and light-duty protection. Compare pros, cons, value, and best-use cases before you buy.",
        altText:
          "Verdict review pin for Kotap 10-ft x 10-ft General Purpose Blue Poly Tarp Review in Tent Tarp.",
      },
    );
  });
});

describe("formatPinterestPublishMessage", () => {
  it("reports a created Pinterest pin", () => {
    assert.equal(
      formatPinterestPublishMessage({ ok: true, skipped: false }),
      "Post published. Pinterest pin created.",
    );
  });

  it("reports a skipped Pinterest pin with the reason", () => {
    assert.equal(
      formatPinterestPublishMessage({
        ok: false,
        skipped: true,
        message: "No product image for pin",
      }),
      "Post published. Pinterest skipped: No product image for pin.",
    );
  });

  it("reports a failed Pinterest pin with the reason", () => {
    assert.equal(
      formatPinterestPublishMessage({
        ok: false,
        skipped: false,
        message: "Pinterest 401: invalid token",
      }),
      "Post published. Pinterest failed: Pinterest 401: invalid token.",
    );
  });
});

describe("formatPostPublishMessage", () => {
  it("reports unpublishing without mentioning Pinterest", () => {
    assert.equal(formatPostPublishMessage(false, null), "Post unpublished.");
  });

  it("includes Pinterest status when publishing", () => {
    assert.equal(
      formatPostPublishMessage(true, {
        ok: false,
        skipped: true,
        message: "PINTEREST_ACCESS_TOKEN unset",
      }),
      "Post published. Pinterest skipped: PINTEREST_ACCESS_TOKEN unset.",
    );
  });
});

describe("buildPinterestPinPayload", () => {
  it("sends generated pin images as base64 so Pinterest does not fetch a temporary URL", () => {
    assert.deepEqual(
      buildPinterestPinPayload({
        boardId: "626211591877797535",
        title: "A helpful product review",
        description: "Practical buying advice.",
        link: "https://verdict.maplehub.cloud/blog/a-helpful-product-review",
        imageBase64: "abc123",
        altText: "Verdict review pin for A helpful product review.",
      }),
      {
        board_id: "626211591877797535",
        title: "A helpful product review",
        description: "Practical buying advice.",
        link: "https://verdict.maplehub.cloud/blog/a-helpful-product-review",
        media_source: {
          source_type: "image_base64",
          content_type: "image/png",
          data: "abc123",
        },
        alt_text: "Verdict review pin for A helpful product review.",
      },
    );
  });
});

describe("parsePinterestPinResponse", () => {
  it("extracts the pin id and URL from Pinterest's create response", () => {
    assert.deepEqual(
      parsePinterestPinResponse({
        id: "1234567890",
        link: "https://verdict.maplehub.cloud/blog/example",
        board_id: "626211591877797535",
      }),
      {
        pinId: "1234567890",
        pinUrl: "https://www.pinterest.com/pin/1234567890/",
      },
    );
  });

  it("keeps working if Pinterest does not return an id", () => {
    assert.deepEqual(parsePinterestPinResponse({}), {
      pinId: null,
      pinUrl: null,
    });
  });
});

describe("Pinterest spam/link throttle helpers", () => {
  it("detects Pinterest link spam blocks", () => {
    assert.equal(
      isPinterestSpamBlockMessage(
        'Pinterest 429: {"code":9,"message":"Sorry! We blocked this link because it may lead to spam."}',
      ),
      true,
    );
    assert.equal(
      isPinterestSpamBlockMessage("Pinterest 401: invalid token"),
      false,
    );
  });

  it("throttles auto-pinning for 24 hours after a spam block", () => {
    const blockedAt = "2026-08-13T03:00:00.000Z";
    const now = new Date("2026-08-13T04:00:00.000Z");

    assert.equal(
      getPinterestThrottleUntil({
        message:
          'Pinterest 429: {"message":"Sorry! We blocked this link because it may lead to spam."}',
        createdAt: blockedAt,
        now,
      })?.toISOString(),
      "2026-08-14T03:00:00.000Z",
    );
  });

  it("does not throttle after the backoff window expires", () => {
    assert.equal(
      getPinterestThrottleUntil({
        message:
          'Pinterest 429: {"message":"Sorry! We blocked this link because it may lead to spam."}',
        createdAt: "2026-08-13T03:00:00.000Z",
        now: new Date("2026-08-14T04:00:00.000Z"),
      }),
      null,
    );
  });
});

describe("normalizeActionResult", () => {
  it("turns an undefined server action response into a safe error", () => {
    assert.deepEqual(
      normalizeActionResult(undefined, "Could not update status."),
      {
        ok: false,
        message: "Could not update status.",
      },
    );
  });

  it("preserves a successful server action message", () => {
    assert.deepEqual(
      normalizeActionResult(
        { ok: true, message: "Post published. Pinterest pin created." },
        "Could not update status.",
      ),
      { ok: true, message: "Post published. Pinterest pin created." },
    );
  });
});

describe("resolveDatabaseUrl", () => {
  it("uses the configured DATABASE_URL when present", () => {
    assert.equal(
      resolveDatabaseUrl({ DATABASE_URL: "postgresql://configured/db" }),
      "postgresql://configured/db",
    );
  });

  it("allows Next production builds to import DB modules without DATABASE_URL", () => {
    assert.equal(
      resolveDatabaseUrl({ NEXT_PHASE: "phase-production-build" }),
      "postgresql://postgres:postgres@127.0.0.1:5432/postgres",
    );
  });

  it("still fails loudly outside build when DATABASE_URL is missing", () => {
    assert.throws(() => resolveDatabaseUrl({}), /Missing DATABASE_URL/);
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
