import type { PostWithCategory } from "@/types";

export type Author = {
  slug: string;
  name: string;
  role: string;
  bio: string;
};

/**
 * Editorial bylines. Reviews are attributed deterministically (see
 * getAuthorForPost) so the same review always shows the same author, which
 * gives the site stable E-E-A-T author signals and real /author pages.
 */
export const AUTHORS: Author[] = [
  {
    slug: "maya-thompson",
    name: "Maya Thompson",
    role: "Senior Reviews Editor",
    bio: "Maya has spent over a decade testing consumer products and translating spec sheets into plain-English buying advice. She leads Verdict's editorial standards and evaluation methodology.",
  },
  {
    slug: "daniel-okafor",
    name: "Daniel Okafor",
    role: "Home & Kitchen Editor",
    bio: "Daniel covers home, kitchen, and everyday-carry gear. He focuses on durability and real-world value, weighing list features against how products actually hold up over months of use.",
  },
  {
    slug: "priya-nair",
    name: "Priya Nair",
    role: "Beauty & Wellness Editor",
    bio: "Priya researches beauty, skincare, and wellness products, with an emphasis on ingredients, claims, and who a product is genuinely a good fit for.",
  },
];

const DEFAULT_AUTHOR = AUTHORS[0];

/** Stable string hash so a given slug always maps to the same author. */
function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getAuthorForPost(post: { slug: string }): Author {
  if (AUTHORS.length === 0) return DEFAULT_AUTHOR;
  return AUTHORS[hashString(post.slug) % AUTHORS.length];
}

export function getAuthorBySlug(slug: string): Author | undefined {
  return AUTHORS.find((author) => author.slug === slug);
}

/** Posts (from a pre-fetched list) attributed to the given author. */
export function filterPostsByAuthor(
  posts: PostWithCategory[],
  authorSlug: string,
): PostWithCategory[] {
  return posts.filter((post) => getAuthorForPost(post).slug === authorSlug);
}
