import { generatePinImage } from "@/lib/pin";

/**
 * Picks a Pinterest board id from the category, mirroring the original n8n
 * keyword routing. Each board must be set via env vars; returns null when none
 * match.
 */
export function pickBoardId(category: string): string | null {
  const c = category.toLowerCase();

  const hair = process.env.PINTEREST_BOARD_HAIR;
  const beauty = process.env.PINTEREST_BOARD_BEAUTY;
  const skin = process.env.PINTEREST_BOARD_SKIN;
  const fallback = process.env.PINTEREST_DEFAULT_BOARD_ID;

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
  imageUrl: string;
}): Promise<void> {
  const token = process.env.PINTEREST_ACCESS_TOKEN;
  if (!token) return;

  const base = process.env.PINTEREST_API_BASE || "https://api.pinterest.com";

  const response = await fetch(`${base}/v5/pins`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      board_id: params.boardId,
      title: params.title.slice(0, 100),
      description: params.description.slice(0, 500),
      link: params.link,
      media_source: { source_type: "image_url", url: params.imageUrl },
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Pinterest ${response.status}: ${text.slice(0, 200)}`);
  }
}

export type PinterestResult = {
  ok: boolean;
  skipped: boolean;
  message?: string;
};

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
    return { ok: false, skipped: true, message: "PINTEREST_ACCESS_TOKEN unset" };
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
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

    await postToPinterest({
      boardId,
      title: params.title,
      description: params.excerpt,
      link: `${baseUrl}/blog/${params.slug}`,
      imageUrl: pin.pinImageUrl,
    });

    return { ok: true, skipped: false };
  } catch (error) {
    console.error("maybePostReviewToPinterest: failed", error);
    return {
      ok: false,
      skipped: false,
      message: error instanceof Error ? error.message : "Pinterest post failed",
    };
  }
}
