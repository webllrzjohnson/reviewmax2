import { cache } from "react";
import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { db } from "@/lib/db";
import { mapCategory, mapPostWithCategory } from "@/lib/db/mappers";
import { categories, posts } from "@/lib/db/schema";
import { resolveAmazonProductImageUrlWithRetry, looksLikeBarePromoImage } from "@/lib/amazon-image";
import {
  validateComparisonPair,
  type ComparePostsResult,
} from "@/lib/compare-validation";
import type {
  Category,
  CategoryWithPostCount,
  PostWithCategory,
} from "@/types";

export type { ComparePostsResult };

export const getCategories = cache(async (): Promise<Category[]> => {
  try {
    const rows = await db
      .select()
      .from(categories)
      .orderBy(categories.name);
    return rows.map(mapCategory);
  } catch (error) {
    console.warn("getCategories", error);
    return [];
  }
});

/** Categories that have at least one published post, with counts. */
export const getCategoriesWithPublishedPosts = cache(async (): Promise<
  CategoryWithPostCount[]
> => {
  try {
    const rows = await db
      .select({
        category: categories,
        postCount: count(posts.id),
      })
      .from(categories)
      .innerJoin(
        posts,
        and(eq(posts.categoryId, categories.id), eq(posts.isPublished, true)),
      )
      .groupBy(categories.id)
      .orderBy(categories.name);

    return rows.map(({ category, postCount }) => ({
      ...mapCategory(category),
      post_count: Number(postCount),
    }));
  } catch (error) {
    console.warn("getCategoriesWithPublishedPosts", error);
    return [];
  }
});

export const getCategoryBySlug = cache(
  async (slug: string): Promise<Category | null> => {
    try {
      const [row] = await db
        .select()
        .from(categories)
        .where(eq(categories.slug, slug))
        .limit(1);
      return row ? mapCategory(row) : null;
    } catch {
      return null;
    }
  },
);

/** Published posts with category, newest first. */
export const getPublishedPosts = cache(async (
  limit = 50,
): Promise<PostWithCategory[]> => {
  try {
    const rows = await db
      .select({
        post: posts,
        category: categories,
      })
      .from(posts)
      .innerJoin(categories, eq(posts.categoryId, categories.id))
      .where(eq(posts.isPublished, true))
      .orderBy(desc(posts.publishedAt))
      .limit(limit);

    return rows.map(({ post, category }) =>
      mapPostWithCategory({ ...post, category }),
    );
  } catch (error) {
    console.warn("getPublishedPosts", error);
    return [];
  }
});

export const getPostBySlug = cache(
  async (slug: string): Promise<PostWithCategory | null> => {
    try {
      const [row] = await db
        .select({
          post: posts,
          category: categories,
        })
        .from(posts)
        .innerJoin(categories, eq(posts.categoryId, categories.id))
        .where(and(eq(posts.slug, slug), eq(posts.isPublished, true)))
        .limit(1);

      if (!row) return null;

      const mapped = mapPostWithCategory({ ...row.post, category: row.category });

      const needsImage =
        !mapped.image_url ||
        looksLikeBarePromoImage(mapped.image_url);

      if (needsImage && mapped.amazon_url) {
        const resolved = await resolveAmazonProductImageUrlWithRetry(
          mapped.amazon_url,
        );
        if (resolved && resolved !== mapped.image_url) {
          void db
            .update(posts)
            .set({
              imageUrl: resolved,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(posts.id, mapped.id))
            .catch((err) =>
              console.warn("getPostBySlug: image backfill failed", err),
            );
          return { ...mapped, image_url: resolved };
        }
      }

      return mapped;
    } catch {
      return null;
    }
  },
);

export async function getPostsByCategorySlug(
  categorySlug: string,
): Promise<PostWithCategory[]> {
  const category = await getCategoryBySlug(categorySlug);
  if (!category) return [];

  try {
    const rows = await db
      .select({
        post: posts,
        category: categories,
      })
      .from(posts)
      .innerJoin(categories, eq(posts.categoryId, categories.id))
      .where(
        and(eq(posts.isPublished, true), eq(posts.categoryId, category.id)),
      )
      .orderBy(desc(posts.publishedAt));

    return rows.map(({ post, category: cat }) =>
      mapPostWithCategory({ ...post, category: cat }),
    );
  } catch (error) {
    console.warn("getPostsByCategorySlug", error);
    return [];
  }
}

export const getPostsByCategoryId = cache(
  async (categoryId: string): Promise<PostWithCategory[]> => {
    try {
      const rows = await db
        .select({
          post: posts,
          category: categories,
        })
        .from(posts)
        .innerJoin(categories, eq(posts.categoryId, categories.id))
        .where(
          and(eq(posts.isPublished, true), eq(posts.categoryId, categoryId)),
        )
        .orderBy(desc(posts.publishedAt));

      return rows.map(({ post, category: cat }) =>
        mapPostWithCategory({ ...post, category: cat }),
      );
    } catch (error) {
      console.warn("getPostsByCategoryId", error);
      return [];
    }
  },
);

export async function getPostsForComparison(
  slugA: string,
  slugB: string,
): Promise<ComparePostsResult> {
  const [a, b] = await Promise.all([
    getPostBySlug(slugA),
    getPostBySlug(slugB),
  ]);

  return validateComparisonPair(a, b);
}

export const getRelatedPosts = cache(async (
  categoryId: string,
  excludeSlug: string,
  limit = 3,
): Promise<PostWithCategory[]> => {
  try {
    const rows = await db
      .select({
        post: posts,
        category: categories,
      })
      .from(posts)
      .innerJoin(categories, eq(posts.categoryId, categories.id))
      .where(
        and(
          eq(posts.isPublished, true),
          eq(posts.categoryId, categoryId),
          ne(posts.slug, excludeSlug),
        ),
      )
      .orderBy(desc(posts.publishedAt))
      .limit(limit);

    return rows.map(({ post, category }) =>
      mapPostWithCategory({ ...post, category }),
    );
  } catch (error) {
    console.warn("getRelatedPosts", error);
    return [];
  }
});

export const getPopularPosts = cache(async (
  limit = 5,
): Promise<PostWithCategory[]> => {
  try {
    const rows = await db
      .select({
        post: posts,
        category: categories,
      })
      .from(posts)
      .innerJoin(categories, eq(posts.categoryId, categories.id))
      .where(eq(posts.isPublished, true))
      .orderBy(
        sql`${posts.rating} desc nulls last`,
        desc(posts.publishedAt),
      )
      .limit(limit);

    return rows.map(({ post, category }) =>
      mapPostWithCategory({ ...post, category }),
    );
  } catch (error) {
    console.warn("getPopularPosts", error);
    return [];
  }
});

/** Top-rated published posts in a category, for best-of roundups. */
export const getTopRatedPostsByCategorySlug = cache(
  async (categorySlug: string, limit = 10): Promise<PostWithCategory[]> => {
    const category = await getCategoryBySlug(categorySlug);
    if (!category) return [];

    try {
      const rows = await db
        .select({
          post: posts,
          category: categories,
        })
        .from(posts)
        .innerJoin(categories, eq(posts.categoryId, categories.id))
        .where(
          and(
            eq(posts.isPublished, true),
            eq(posts.categoryId, category.id),
          ),
        )
        .orderBy(
          sql`${posts.rating} desc nulls last`,
          desc(posts.publishedAt),
        )
        .limit(limit);

      return rows.map(({ post, category: cat }) =>
        mapPostWithCategory({ ...post, category: cat }),
      );
    } catch (error) {
      console.warn("getTopRatedPostsByCategorySlug", error);
      return [];
    }
  },
);

export type PostsPageResult = {
  posts: PostWithCategory[];
  total: number;
};

export type BlogSort = "newest" | "highest-rated" | "recently-updated";

export async function getPublishedPostsPage(params: {
  page?: number;
  pageSize?: number;
  q?: string;
  categorySlug?: string;
  minRating?: number;
  sort?: BlogSort;
}): Promise<PostsPageResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(48, Math.max(1, params.pageSize ?? 9));
  const offset = (page - 1) * pageSize;

  const filters = [eq(posts.isPublished, true)];

  if (params.q?.trim()) {
    const safe = params.q.trim().replace(/[%_]/g, " ").slice(0, 80);
    if (safe.length > 0) {
      const pattern = `%${safe}%`;
      filters.push(
        or(ilike(posts.title, pattern), ilike(posts.excerpt, pattern))!,
      );
    }
  }

  if (params.categorySlug) {
    const category = await getCategoryBySlug(params.categorySlug);
    if (!category) {
      return { posts: [], total: 0 };
    }
    filters.push(eq(posts.categoryId, category.id));
  }

  if (params.minRating && params.minRating > 0) {
    filters.push(gte(posts.rating, String(params.minRating)));
  }

  const whereClause = and(...filters);

  const orderBy =
    params.sort === "highest-rated"
      ? desc(posts.rating)
      : params.sort === "recently-updated"
        ? desc(posts.updatedAt)
        : desc(posts.publishedAt);

  try {
    const [totalRow] = await db
      .select({ total: count() })
      .from(posts)
      .where(whereClause);

    const rows = await db
      .select({
        post: posts,
        category: categories,
      })
      .from(posts)
      .innerJoin(categories, eq(posts.categoryId, categories.id))
      .where(whereClause)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset(offset);

    return {
      posts: rows.map(({ post, category }) =>
        mapPostWithCategory({ ...post, category }),
      ),
      total: Number(totalRow?.total ?? 0),
    };
  } catch (error) {
    console.warn("getPublishedPostsPage", error);
    return { posts: [], total: 0 };
  }
}
