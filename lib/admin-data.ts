import { asc, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  mapCategory,
  mapPostWithCategory,
  mapReviewRequest,
} from "@/lib/db/mappers";
import {
  categories,
  newsletterSubscribers,
  pinterestPostLogs,
  posts,
  reviewRequests,
} from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import type {
  Category,
  NewsletterSubscriber,
  PostWithCategory,
  ReviewRequest,
} from "@/types";

export type AdminDashboardData = {
  email: string;
  stats: {
    posts: number;
    categories: number;
    subscribers: number;
    pendingReviewRequests: number;
  };
  recentRequests: ReviewRequest[];
};

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const session = await requireAdmin();

  const [
    postsRes,
    categoriesRes,
    subscribersRes,
    requestsRes,
    recentRequestsRes,
  ] = await Promise.all([
    db.select({ total: count() }).from(posts),
    db.select({ total: count() }).from(categories),
    db.select({ total: count() }).from(newsletterSubscribers),
    db
      .select({ total: count() })
      .from(reviewRequests)
      .where(isNull(reviewRequests.processedAt)),
    db
      .select()
      .from(reviewRequests)
      .orderBy(desc(reviewRequests.createdAt))
      .limit(10),
  ]);

  return {
    email: session.user.email!,
    stats: {
      posts: Number(postsRes[0]?.total ?? 0),
      categories: Number(categoriesRes[0]?.total ?? 0),
      subscribers: Number(subscribersRes[0]?.total ?? 0),
      pendingReviewRequests: Number(requestsRes[0]?.total ?? 0),
    },
    recentRequests: recentRequestsRes.map(mapReviewRequest),
  };
}

export async function getAdminPostById(
  id: string,
): Promise<PostWithCategory | null> {
  await requireAdmin();

  const [row] = await db
    .select({
      post: posts,
      category: categories,
    })
    .from(posts)
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .where(eq(posts.id, id))
    .limit(1);

  if (!row) return null;
  return mapPostWithCategory({ ...row.post, category: row.category });
}

export type AdminCategory = Category & { postCount: number };

export async function getAdminCategories(): Promise<AdminCategory[]> {
  await requireAdmin();
  try {
    const rows = await db
      .select({ category: categories, postCount: count(posts.id) })
      .from(categories)
      .leftJoin(posts, eq(categories.id, posts.categoryId))
      .groupBy(categories.id)
      .orderBy(categories.name);
    return rows.map(({ category, postCount }) => ({
      ...mapCategory(category),
      postCount: Number(postCount),
    }));
  } catch (error) {
    console.warn("getAdminCategories", error);
    return [];
  }
}

export async function getAdminCategoryById(
  id: string,
): Promise<Category | null> {
  await requireAdmin();
  try {
    const [row] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);
    return row ? mapCategory(row) : null;
  } catch {
    return null;
  }
}

export async function getAllSubscribers(): Promise<NewsletterSubscriber[]> {
  await requireAdmin();
  try {
    const rows = await db
      .select()
      .from(newsletterSubscribers)
      .orderBy(asc(newsletterSubscribers.createdAt));
    return rows.map((r) => ({
      id: r.id,
      email: r.email,
      created_at: r.createdAt,
    }));
  } catch {
    return [];
  }
}

export async function getAllReviewRequests(): Promise<ReviewRequest[]> {
  await requireAdmin();
  try {
    const rows = await db
      .select()
      .from(reviewRequests)
      .orderBy(desc(reviewRequests.createdAt));
    return rows.map(mapReviewRequest);
  } catch {
    return [];
  }
}

export async function getAdminPosts(): Promise<PostWithCategory[]> {
  await requireAdmin();

  try {
    const rows = await db
      .select({
        post: posts,
        category: categories,
      })
      .from(posts)
      .leftJoin(categories, eq(posts.categoryId, categories.id))
      .orderBy(desc(posts.updatedAt));

    const postIds = rows.map(({ post }) => post.id);
    const latestPinterestLogByPost = new Map<
      string,
      typeof pinterestPostLogs.$inferSelect
    >();

    if (postIds.length) {
      const logs = await db
        .select()
        .from(pinterestPostLogs)
        .where(inArray(pinterestPostLogs.postId, postIds))
        .orderBy(desc(pinterestPostLogs.createdAt));

      for (const log of logs) {
        if (!latestPinterestLogByPost.has(log.postId)) {
          latestPinterestLogByPost.set(log.postId, log);
        }
      }
    }

    return rows.map(({ post, category }) =>
      mapPostWithCategory({
        ...post,
        category,
        pinterestPostLog: latestPinterestLogByPost.get(post.id) ?? null,
      }),
    );
  } catch (error) {
    console.warn("getAdminPosts", error);
    return [];
  }
}
