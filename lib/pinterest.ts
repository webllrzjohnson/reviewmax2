import { generatePinImage } from "@/lib/pin";

/**
 * Picks a Pinterest board id from the category, mirroring the original n8n
 * keyword routing. Each board must be set via env vars; returns null when none
 * match.
 */
export function pickBoardId(category: string): string | null {
  const c = category.toLowerCase();

  const camping = process.env.PINTEREST_BOARD_CAMPING;
  const hiking = process.env.PINTEREST_BOARD_HIKING;
  const fishing = process.env.PINTEREST_BOARD_FISHING;
  const cycling = process.env.PINTEREST_BOARD_CYCLING;
  const water = process.env.PINTEREST_BOARD_WATER;
  const outdoorApparel = process.env.PINTEREST_BOARD_OUTDOOR_APPAREL;
  const homeTools = process.env.PINTEREST_BOARD_HOME_TOOLS;
  const hair = process.env.PINTEREST_BOARD_HAIR;
  const beauty = process.env.PINTEREST_BOARD_BEAUTY;
  const skin = process.env.PINTEREST_BOARD_SKIN;
  const fallback = process.env.PINTEREST_DEFAULT_BOARD_ID;

  if (
    (c.includes("camping") ||
      c.includes("tent") ||
      c.includes("tarp") ||
      c.includes("sleeping") ||
      c.includes("camp")) &&
    camping
  ) {
    return camping;
  }
  if (
    (c.includes("hiking") ||
      c.includes("backpacking") ||
      c.includes("trail") ||
      c.includes("trekking") ||
      c.includes("navigation") ||
      c.includes("survival")) &&
    hiking
  ) {
    return hiking;
  }
  if ((c.includes("fishing") || c.includes("angling")) && fishing)
    return fishing;
  if (
    (c.includes("cycling") || c.includes("bike") || c.includes("biking")) &&
    cycling
  ) {
    return cycling;
  }
  if (
    (c.includes("apparel") ||
      c.includes("footwear") ||
      c.includes("outerwear")) &&
    outdoorApparel
  ) {
    return outdoorApparel;
  }
  if (
    (c.includes("water") ||
      c.includes("beach") ||
      c.includes("surf") ||
      c.includes("kayak") ||
      c.includes("paddle") ||
      c.includes("swim")) &&
    water
  ) {
    return water;
  }
  if (
    (c.includes("tool") ||
      c.includes("diy") ||
      c.includes("home") ||
      c.includes("property") ||
      c.includes("maintenance")) &&
    homeTools
  ) {
    return homeTools;
  }
  if (c.includes("hair") && hair) return hair;
  if ((c.includes("luxury") || c.includes("beauty")) && beauty) return beauty;
  if ((c.includes("skin") || c.includes("sunscreen")) && skin) return skin;
  return fallback ?? null;
}

function isLocalSiteUrl(baseUrl: string): boolean {
  try {
    const host = new URL(baseUrl).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");
  }
}

async function postToPinterest(params: {
  boardId: string;
  title: string;
  description: string;
  link: string;
  imageBase64: string;
  altText?: string;
}): Promise<{ pinId: string | null; pinUrl: string | null }> {
  const token = process.env.PINTEREST_ACCESS_TOKEN;
  if (!token) return { pinId: null, pinUrl: null };

  const base = process.env.PINTEREST_API_BASE || "https://api.pinterest.com";

  const response = await fetch(`${base}/v5/pins`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(buildPinterestPinPayload(params)),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Pinterest ${response.status}: ${text.slice(0, 200)}`);
  }

  return parsePinterestPinResponse(await response.json().catch(() => null));
}

export type PinterestResult = {
  ok: boolean;
  skipped: boolean;
  message?: string;
  boardId?: string | null;
  pinId?: string | null;
  pinUrl?: string | null;
};

export function parsePinterestPinResponse(value: unknown): {
  pinId: string | null;
  pinUrl: string | null;
} {
  const id =
    value &&
    typeof value === "object" &&
    "id" in value &&
    typeof value.id === "string"
      ? value.id
      : null;

  return {
    pinId: id,
    pinUrl: id ? `https://www.pinterest.com/pin/${id}/` : null,
  };
}

export function buildPinterestPinPayload(params: {
  boardId: string;
  title: string;
  description: string;
  link: string;
  imageBase64: string;
  altText?: string;
}) {
  return {
    board_id: params.boardId,
    title: params.title.slice(0, 100),
    description: params.description.slice(0, 500),
    link: params.link,
    media_source: {
      source_type: "image_base64",
      content_type: "image/png",
      data: params.imageBase64,
    },
    ...(params.altText ? { alt_text: params.altText.slice(0, 500) } : {}),
  };
}

function normalizeCategoryLabel(categorySlug: string) {
  return categorySlug
    .replace(/[-_]+/g, " ")
    .replace(/\s*&\s*/g, " & ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildPinterestPinText(params: {
  title: string;
  excerpt: string;
  categorySlug: string;
}) {
  const category = normalizeCategoryLabel(params.categorySlug) || "product";
  const title = params.title.trim().slice(0, 100);
  const excerpt = params.excerpt.trim();
  const description =
    `Practical ${category} review: ${excerpt} Compare pros, cons, value, and best-use cases before you buy.`.slice(
      0,
      500,
    );

  return {
    title,
    description,
    altText: `Verdict review pin for ${title} in ${category}.`.slice(0, 500),
  };
}

function normalizeMessage(message: string | undefined, fallback: string) {
  const text = message?.trim() || fallback;
  return text.endsWith(".") ? text : `${text}.`;
}

export function formatPinterestPublishMessage(result: PinterestResult | null) {
  if (!result) return "Post published.";
  if (result.ok) return "Post published. Pinterest pin created.";
  if (result.skipped) {
    return `Post published. Pinterest skipped: ${normalizeMessage(result.message, "No reason provided")}`;
  }
  return `Post published. Pinterest failed: ${normalizeMessage(result.message, "Unknown error")}`;
}

export function formatPostPublishMessage(
  isPublished: boolean,
  pinterestResult: PinterestResult | null,
) {
  return isPublished
    ? formatPinterestPublishMessage(pinterestResult)
    : "Post unpublished.";
}

/**
 * Best-effort: generates a pin image and posts it to Pinterest on publish.
 * Returns rather than throwing so a failure never blocks publishing. No-ops when
 * PINTEREST_ACCESS_TOKEN is unset, the site URL is local, or there is no board
 * or product image.
 */
export async function maybePostReviewToPinterest(params: {
  title: string;
  excerpt: string;
  slug: string;
  categorySlug: string;
  rating: number;
  imageUrl: string | null;
}): Promise<PinterestResult> {
  if (!process.env.PINTEREST_ACCESS_TOKEN) {
    return {
      ok: false,
      skipped: true,
      message: "PINTEREST_ACCESS_TOKEN unset",
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  if (isLocalSiteUrl(baseUrl)) {
    return {
      ok: false,
      skipped: true,
      message: "Local site URL; skipping Pinterest",
    };
  }

  const boardId = pickBoardId(params.categorySlug);
  if (!boardId) {
    return {
      ok: false,
      skipped: true,
      message: "No Pinterest board configured for this category",
    };
  }

  if (!params.imageUrl) {
    return { ok: false, skipped: true, message: "No product image for pin" };
  }

  try {
    const pin = await generatePinImage({
      title: params.title,
      category: params.categorySlug,
      rating: params.rating,
      image: params.imageUrl,
      slug: params.slug,
    });

    if (!pin.ok) {
      console.error("maybePostReviewToPinterest: pin image failed", pin.error);
      return { ok: false, skipped: false, message: pin.error };
    }

    const pinText = buildPinterestPinText({
      title: params.title,
      excerpt: params.excerpt,
      categorySlug: params.categorySlug,
    });

    const postedPin = await postToPinterest({
      boardId,
      title: pinText.title,
      description: pinText.description,
      link: `${baseUrl}/blog/${params.slug}`,
      imageBase64: pin.imageBase64,
      altText: pinText.altText,
    });

    return { ok: true, skipped: false, boardId, ...postedPin };
  } catch (error) {
    console.error("maybePostReviewToPinterest: failed", error);
    return {
      ok: false,
      skipped: false,
      message: error instanceof Error ? error.message : "Pinterest post failed",
    };
  }
}
