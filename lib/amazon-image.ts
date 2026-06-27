const ASIN_PATTERNS = [
  /\/dp\/([A-Z0-9]{10})/i,
  /\/gp\/product\/([A-Z0-9]{10})/i,
  /\/product\/([A-Z0-9]{10})/i,
  /[?&]asin=([A-Z0-9]{10})/i,
];

export {
  coerceProductImageUrl,
  isAmazonProductPageUrl,
  isDirectImageUrl,
} from "@/lib/image-url";

const AMAZON_IMAGE_HOST =
  /^https:\/\/(?:m\.media-amazon\.com|images(?:-na)?\.ssl-images-amazon\.com)\//i;

const SHORT_LINK_HOST =
  /^(?:https?:\/\/)?(?:a\.co|amzn\.to|amzn\.com|amzn\.asia|amzn\.eu)\//i;

/** Amazon returns a 1×1 tracking GIF for invalid /P/{ASIN} paths. */
const MIN_IMAGE_BYTES = 2_000;

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Upgrade-Insecure-Requests": "1",
};

/** Extract a 10-character ASIN from common Amazon product URLs. */
export function extractAsinFromAmazonUrl(url: string): string | null {
  for (const pattern of ASIN_PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1].toUpperCase();
  }
  return null;
}

/**
 * Follows Amazon short links (a.co, amzn.to) and returns the final product URL.
 * If the URL already contains an ASIN, returns it unchanged (without query string).
 */
export async function expandAmazonProductUrl(url: string): Promise<string> {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  if (extractAsinFromAmazonUrl(trimmed)) {
    return trimmed.split("?")[0];
  }

  if (!SHORT_LINK_HOST.test(trimmed)) {
    return trimmed;
  }

  try {
    const response = await fetch(trimmed, {
      method: "GET",
      redirect: "follow",
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(15_000),
    });

    const finalUrl = response.url || trimmed;
    if (extractAsinFromAmazonUrl(finalUrl)) {
      return finalUrl.split("?")[0];
    }
  } catch {
    // keep original
  }

  return trimmed;
}

function decodeAmazonUrl(raw: string): string {
  return raw
    .replace(/&amp;/g, "&")
    .replace(/\\u002F/g, "/")
    .replace(/\\\//g, "/")
    .trim();
}

function normalizeAmazonImageUrl(raw: string): string | null {
  const decoded = decodeAmazonUrl(raw);
  if (!decoded.startsWith("http")) return null;
  if (!AMAZON_IMAGE_HOST.test(decoded)) return null;
  if (/\/images\/P\//i.test(decoded)) return null;
  if (/\.(svg|gif)$/i.test(decoded)) return null;
  return upscaleAmazonImageUrl(decoded.split("?")[0]);
}

/** Collapse Amazon size suffixes to a single high-res variant. */


function upscaleAmazonImageUrl(url: string): string {
  const base = url.split("?")[0];
  const match = base.match(
    /^(https:\/\/.+\/images\/[A-Z]\/[A-Za-z0-9+\-]+)/i,
  );
  if (match) {
    return `${match[1]}._SL1500_.jpg`;
  }
  return base;
}

/*
function upscaleAmazonImageUrl(url: string): string {
  const base = url.split("?")[0];
  const match = base.match(
    /^(https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+._%-]+)(?:\._[A-Za-z0-9]+_)*\.(jpe?g|png|webp)$/i,
  );
  if (match) {
    return `${match[1]}._AC_SL1500_.${match[2]}`;
  }
  if (!/\._[A-Z0-9]+_\./i.test(base)) {
    return base.replace(/\.(jpe?g|png|webp)$/i, "._AC_SL1500_.$1");
  }
  return base.replace(/(\._[A-Za-z0-9]+_)+(?=\.[a-z]+$)/i, "._AC_SL1500_.");
}
*/
const THUMBNAIL_MARKER =
  /\._(?:SS|SX|SY|US|SR|CR|AC_US|AC_SY|AC_SX|SL\d{1,3})_\./i;

function isProductImageHost(url: string): boolean {
  if (!AMAZON_IMAGE_HOST.test(url)) return false;
  if (/\/images\/(?:G|S)\//i.test(url)) return false;
  if (/grey-pixel/i.test(url)) return false;
  if (/aax-.*amazon/i.test(url)) return false;
  if (/\.pdf$/i.test(url)) return false;
  return /\/images\/I\//i.test(url);
}

function upscaledFromThumbnailUrl(raw: string): string | null {
  const match = raw.match(
    /^(https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+\-]+)/i,
  );
  return match ? upscaleAmazonImageUrl(match[1]) : null;
}

/**
 * Collects product image URLs in priority order (best first). Uses ordered
 * dedupe — unlike a Set, first occurrence wins so promos scraped early do not
 * beat the gallery hero.
 */
function collectAmazonImageCandidates(text: string, asin: string): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();

  const push = (raw: string | undefined) => {
    if (!raw) return;
    const url = normalizeAmazonImageUrl(raw);
    if (!url || !isProductImageHost(url)) return;
    if (seen.has(url)) return;
    seen.add(url);
    ordered.push(url);
  };

  const pushThumbnailBase = (raw: string | undefined) => {
    if (!raw) return;
    const url = upscaledFromThumbnailUrl(raw);
    if (!url || !isProductImageHost(url)) return;
    if (seen.has(url)) return;
    seen.add(url);
    ordered.push(url);
  };

  // 1. Primary hero from the product image widget.
  const landingPatterns = [
    /id=["']landingImage["'][^>]*(?:data-old-hires|src)=["']([^"']+)["']/i,
    /(?:data-old-hires|src)=["']([^"']+)["'][^>]*id=["']landingImage["']/i,
  ];
  for (const pattern of landingPatterns) {
    push(text.match(pattern)?.[1]);
  }

  // 2. Open Graph (when present).
  const ogPatterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
  ];
  for (const pattern of ogPatterns) {
    push(text.match(pattern)?.[1]);
  }

  // 3. First hiRes in colorImages.initial (main gallery slot).
  const colorInitial = text.match(
    /"colorImages"\s*:\s*\{[\s\S]*?"initial"\s*:\s*\[[\s\S]*?"hiRes"\s*:\s*"(https:\/\/[^"]+)"/i,
  );
  push(colorInitial?.[1]);

  // 4. First hiRes / large in the page JSON (usually the hero).
  push(text.match(/"hiRes"\s*:\s*"(https:\/\/[^"]+)"/)?.[1]);
  push(text.match(/"large"\s*:\s*"(https:\/\/[^"]+)"/)?.[1]);

  for (const match of text.matchAll(
    /data-old-hires=["'](https:\/\/m\.media-amazon\.com\/images\/I\/[^"']+)["']/gi,
  )) {
    push(match[1]);
  }

  // 5. Product section only — skip nav promos like "Summer Edit" above the listing.
  const asinMarker = `/dp/${asin}`;
  const asinIdx = text.indexOf(asinMarker);
  const productSection =
    asinIdx >= 0 ? text.slice(asinIdx, asinIdx + 80_000) : text;

  const galleryThumb = productSection.match(
    /https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+\-]+\._AC_US40_\.jpg/i,
  );
  pushThumbnailBase(galleryThumb?.[0]);

  const ssThumb = productSection.match(
    /https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+\-]+\._SS75_\.jpg/i,
  );
  pushThumbnailBase(ssThumb?.[0]);

  for (const match of productSection.matchAll(
    /https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+._%-]+\.(?:jpg|jpeg|png|webp)/gi,
  )) {
    const raw = match[0];
    if (THUMBNAIL_MARKER.test(raw)) continue;
    push(raw);
  }

  return ordered;
}

/** GET the first bytes of a URL and confirm it is a real product photo (not a 1×1 GIF). */
async function measureImageBytes(url: string): Promise<number | null> {
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": BROWSER_HEADERS["User-Agent"],
        Range: "bytes=0-16383",
      },
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) return null;

    const type = response.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) return null;

    const buf = await response.arrayBuffer();
    const bytes = buf.byteLength;
    if (bytes < MIN_IMAGE_BYTES) return null;

    return bytes;
  } catch {
    return null;
  }
}

async function pickBestVerifiedImage(urls: string[]): Promise<string | null> {
  // Prefer the first high-confidence candidate that loads, not the largest file
  // on the page (promo banners and ads are often bigger than the hero thumb).
  for (const url of urls) {
    const bytes = await measureImageBytes(url);
    if (bytes !== null) return url;
  }
  return null;
}

async function fetchAmazonPage(productUrl: string): Promise<string | null> {
  const urls = [
    productUrl,
    productUrl.replace(/amazon\.[a-z.]+\/dp\//, "amazon.com/dp/"),
    productUrl.replace(/amazon\.[a-z.]+\/dp\//, "amazon.ca/dp/"),
  ].filter((u, i, arr) => arr.indexOf(u) === i);

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: BROWSER_HEADERS,
        redirect: "follow",
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      });

      if (!response.ok) continue;

      const html = await response.text();
      if (
        html.includes("Type the characters you see in this image") ||
        html.includes("Enter the characters you see below") ||
        (html.includes("api-services-support@amazon.com") &&
          html.length < 5000)
      ) {
        continue;
      }

      return html;
    } catch {
      continue;
    }
  }

  return null;
}

/** Jina Reader proxy — works when the app server IP is blocked by Amazon. */
async function fetchAmazonPageViaJina(productUrl: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://r.jina.ai/${encodeURIComponent(productUrl)}`,
      {
        headers: { Accept: "text/plain" },
        signal: AbortSignal.timeout(30_000),
      },
    );
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

/**
 * Resolves a product hero image from an Amazon URL.
 * Tries direct page scrape, then Jina proxy, then verifies candidates are real JPEGs.
 */
export async function resolveAmazonProductImageUrl(
  amazonUrl: string,
): Promise<string | null> {
  const expanded = await expandAmazonProductUrl(amazonUrl);
  const asin = extractAsinFromAmazonUrl(expanded);
  if (!asin) return null;

  const productUrl = expanded.includes("/dp/")
    ? expanded.split("?")[0]
    : `https://www.amazon.com/dp/${asin}`;

  const candidates: string[] = [];

  const html = await fetchAmazonPage(productUrl);
  if (html) {
    candidates.push(...collectAmazonImageCandidates(html, asin));
  }

  if (candidates.length === 0) {
    const jina = await fetchAmazonPageViaJina(productUrl);
    if (jina) {
      candidates.push(...collectAmazonImageCandidates(jina, asin));
    }
  }

  if (candidates.length === 0) return null;

  return pickBestVerifiedImage(candidates);
}

/** Bare /images/I/{id}.jpg URLs (no size suffix) are often nav promos, not the hero. */
export function looksLikeBarePromoImage(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\/images\/I\/[A-Za-z0-9+\-]+\.jpg$/i.test(url.split("?")[0]);
}

/** Retries image resolution — Amazon often blocks or times out on the first attempt. */
export async function resolveAmazonProductImageUrlWithRetry(
  amazonUrl: string,
  attempts = 3,
): Promise<string | null> {
  for (let i = 0; i < attempts; i += 1) {
    const url = await resolveAmazonProductImageUrl(amazonUrl);
    if (url) return url;
    if (i < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  return null;
}
