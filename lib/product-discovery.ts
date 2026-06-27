import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { extractAsinFromAmazonUrl } from "@/lib/amazon-image";
import { COUNTRY_TO_AMAZON_DOMAIN } from "@/lib/countries";

export type DiscoveredProduct = {
  rank: number;
  category: string;
  name: string;
  amazon_url: string;
  image_url: string | null;
};

export type DiscoverResult =
  | { ok: true; products: DiscoveredProduct[] }
  | { ok: false; message: string };

type SerpApiItem = {
  title?: string;
  brand?: string;
  thumbnail?: string;
  link?: string;
  asin?: string;
};

/**
 * Searches Amazon via SerpApi and returns the top de-duplicated products,
 * porting the "Fetch Amazon" + "Parse Top 5 Products" n8n nodes.
 */
export async function discoverProducts(
  category: string,
  country: string,
): Promise<DiscoverResult> {
  const key = process.env.SERPAPI_KEY;
  if (!key) {
    return { ok: false, message: "SERPAPI_KEY is not configured." };
  }

  const searchTerm = category.trim();
  if (!searchTerm) {
    return { ok: false, message: "Enter a category to search." };
  }

  const domain = COUNTRY_TO_AMAZON_DOMAIN[country] ?? "amazon.com";
  const url =
    `https://serpapi.com/search.json?engine=amazon` +
    `&k=${encodeURIComponent(searchTerm)}` +
    `&amazon_domain=${domain}` +
    `&s=exact-aware-popularity-rank&device=desktop&no_cache=true` +
    `&api_key=${key}&num=10`;

  let data: { organic_results?: SerpApiItem[] };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      return { ok: false, message: `SerpApi returned ${res.status}.` };
    }
    data = (await res.json()) as { organic_results?: SerpApiItem[] };
  } catch (error) {
    console.error("discoverProducts: SerpApi request failed", error);
    return { ok: false, message: "Could not reach SerpApi. Try again." };
  }

  const organic = data.organic_results;
  if (!organic || organic.length === 0) {
    return { ok: false, message: "No products found for that category." };
  }

  const categorySlug = searchTerm.toLowerCase().replace(/\s+/g, "-");
  const seenBrands = new Set<string>();

  const filtered = organic
    .filter((item) => {
      const title = String(item.title ?? "");
      const brand = (
        item.brand || title.split(" ").slice(0, 2).join(" ")
      ).toLowerCase();
      if (!title || seenBrands.has(brand)) return false;
      seenBrands.add(brand);
      return true;
    })
    .slice(0, 6);

  const products: DiscoveredProduct[] = filtered.map((item, i) => {
    let image: string | null = item.thumbnail?.trim() ? item.thumbnail : null;
    if (image) {
      const match = image.match(
        /^(https:\/\/.+\/images\/[A-Z]\/[A-Za-z0-9+\-]+)/i,
      );
      image = match ? `${match[1]}._SL1500_.jpg` : null;
    } else if (item.asin) {
      image = `https://images-na.ssl-images-amazon.com/images/P/${item.asin}.jpg`;
    }

    return {
      rank: i + 1,
      category: categorySlug,
      name: String(item.title),
      amazon_url:
        item.link || `https://www.${domain}/dp/${item.asin ?? ""}`,
      image_url: image,
    };
  });

  return { ok: true, products };
}

/** Removes products whose ASIN already exists in the posts table. */
export async function filterExistingByAsin(
  products: DiscoveredProduct[],
): Promise<DiscoveredProduct[]> {
  const rows = await db.select({ amazonUrl: posts.amazonUrl }).from(posts);
  const existing = new Set(
    rows
      .map((r) => extractAsinFromAmazonUrl(r.amazonUrl))
      .filter((a): a is string => Boolean(a)),
  );

  return products.filter((p) => {
    const asin = extractAsinFromAmazonUrl(p.amazon_url);
    return !asin || !existing.has(asin);
  });
}
