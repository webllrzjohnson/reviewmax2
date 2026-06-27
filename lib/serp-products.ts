export type SerpApiItem = {
  title?: string;
  brand?: string;
  thumbnail?: string;
  link?: string;
  asin?: string;
};

/** De-duplicates SerpApi organic results by brand, keeping the first N items. */
export function dedupeSerpResultsByBrand(
  organic: SerpApiItem[],
  limit = 6,
): SerpApiItem[] {
  const seenBrands = new Set<string>();

  return organic
    .filter((item) => {
      const title = String(item.title ?? "");
      const brand = (
        item.brand || title.split(" ").slice(0, 2).join(" ")
      ).toLowerCase();
      if (!title || seenBrands.has(brand)) return false;
      seenBrands.add(brand);
      return true;
    })
    .slice(0, limit);
}
