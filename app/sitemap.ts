import type { MetadataRoute } from "next";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, posts } from "@/lib/db/schema";
import { siteUrl } from "@/lib/utils";
import { AUTHORS } from "@/lib/authors";
import { buildComparePairs } from "@/lib/compare-pairs";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/blog`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/best`, changeFrequency: "weekly", priority: 0.85 },
    { url: `${base}/compare`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/about`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/contact`, changeFrequency: "yearly", priority: 0.4 },
    {
      url: `${base}/affiliate-disclosure`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    { url: `${base}/privacy-policy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.3 },
    ...AUTHORS.map((author) => ({
      url: `${base}/author/${author.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    })),
  ];

  if (!process.env.DATABASE_URL) {
    return staticRoutes;
  }

  try {
    const [publishedPosts, categoryRows] = await Promise.all([
      db
        .select({
          slug: posts.slug,
          categoryId: posts.categoryId,
          publishedAt: posts.publishedAt,
          updatedAt: posts.updatedAt,
        })
        .from(posts)
        .where(eq(posts.isPublished, true)),
      db
        .select({
          slug: categories.slug,
          createdAt: categories.createdAt,
          postCount: count(posts.id),
        })
        .from(categories)
        .innerJoin(
          posts,
          and(
            eq(posts.categoryId, categories.id),
            eq(posts.isPublished, true),
          ),
        )
        .groupBy(categories.id, categories.slug, categories.createdAt),
    ]);

    const postRoutes =
      publishedPosts.map((post) => ({
        url: `${base}/blog/${post.slug}`,
        lastModified: new Date(post.updatedAt ?? post.publishedAt ?? Date.now()),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })) ?? [];

    const categoryRoutes =
      categoryRows.map((category) => ({
        url: `${base}/category/${category.slug}`,
        lastModified: new Date(category.createdAt ?? Date.now()),
        changeFrequency: "weekly" as const,
        priority: 0.65,
      })) ?? [];

    const roundupRoutes = categoryRows
      .filter((category) => Number(category.postCount) >= 2)
      .map((category) => ({
        url: `${base}/best/${category.slug}`,
        lastModified: new Date(category.createdAt ?? Date.now()),
        changeFrequency: "weekly" as const,
        priority: 0.82,
      }));

    const compareRoutes = buildComparePairs(
      publishedPosts.map((post) => ({
        slug: post.slug,
        category_id: post.categoryId,
      })),
    ).map((pair) => ({
      url: `${base}/compare/${pair}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

    return [
      ...staticRoutes,
      ...categoryRoutes,
      ...roundupRoutes,
      ...postRoutes,
      ...compareRoutes,
    ];
  } catch (error) {
    console.warn("sitemap database read failed", error);
    return staticRoutes;
  }
}
