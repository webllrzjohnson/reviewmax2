/** Minimal fields needed to group and pair posts for comparison. */
export type ComparablePost = { slug: string; category_id: string };

/** Separator between the two slugs in a /compare/<a>-vs-<b> URL. */
export const PAIR_SEPARATOR = "-vs-";

/** Canonical pair key: slugs sorted so a-vs-b and b-vs-a collapse to one URL. */
export function canonicalPair(slugA: string, slugB: string): string {
  return [slugA, slugB].sort().join(PAIR_SEPARATOR);
}

/** Splits a "<a>-vs-<b>" path segment back into its two slugs. */
export function parsePair(
  pair: string,
): { left: string; right: string } | null {
  const idx = pair.indexOf(PAIR_SEPARATOR);
  if (idx <= 0) return null;
  const left = pair.slice(0, idx);
  const right = pair.slice(idx + PAIR_SEPARATOR.length);
  if (!left || !right || left === right) return null;
  return { left, right };
}

/**
 * Builds canonical comparison pairs from published posts, grouped by category
 * (comparisons only make sense within a category). Caps pairs per category and
 * overall so the static set never explodes combinatorially.
 */
export function buildComparePairs(
  posts: ComparablePost[],
  options: { perCategory?: number; max?: number } = {},
): string[] {
  const perCategory = options.perCategory ?? 6;
  const max = options.max ?? 300;

  const byCategory = new Map<string, string[]>();
  for (const post of posts) {
    const list = byCategory.get(post.category_id);
    if (list) {
      if (list.length < perCategory) list.push(post.slug);
    } else {
      byCategory.set(post.category_id, [post.slug]);
    }
  }

  const pairs = new Set<string>();
  for (const slugs of byCategory.values()) {
    for (let i = 0; i < slugs.length; i += 1) {
      for (let j = i + 1; j < slugs.length; j += 1) {
        pairs.add(canonicalPair(slugs[i], slugs[j]));
        if (pairs.size >= max) return Array.from(pairs);
      }
    }
  }

  return Array.from(pairs);
}
