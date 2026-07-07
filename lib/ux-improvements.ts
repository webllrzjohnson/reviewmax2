import type { CategoryWithPostCount, PostWithCategory } from "@/types";

export const TRUST_SIGNALS = [
  "Independent scoring criteria",
  "Clear pros and cons",
  "Affiliate links never affect ratings",
  "Reviews updated as products change",
] as const;

export const POPULAR_SEARCH_SUGGESTIONS = [
  "Garmin Fenix 8",
  "Vitamin C serum",
  "Cat litter",
  "Dog grooming kit",
  "Sunscreen stick",
  "Kitchen gadgets",
  "Anti aging cream",
  "Smart scale",
] as const;

export function getFeaturedCategories(
  categories: CategoryWithPostCount[],
  limit = 8,
): CategoryWithPostCount[] {
  return [...categories]
    .sort((a, b) => {
      if (b.post_count !== a.post_count) return b.post_count - a.post_count;
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}

export function getReviewSummaryBullets(post: PostWithCategory) {
  const rating = Number(post.rating ?? 0);
  const categoryName = post.category?.name ?? "product";
  const ratingQualifier = rating >= 4.5 ? "top-rated" : rating >= 4 ? "well-rated" : "carefully researched";

  return {
    pros: post.pros.slice(0, 3),
    cons: post.cons.slice(0, 3),
    bestFor: `${categoryName} shoppers who want a ${ratingQualifier} option${rating >= 4.5 ? " and can justify the premium" : " with clear trade-offs"}.`,
  };
}
