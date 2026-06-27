import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { posts } from "../lib/db/schema";
import { resolveAmazonProductImageUrlWithRetry } from "../lib/amazon-image";

/** One-off / admin: refresh hero image for a post from its Amazon URL. */
async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Usage: tsx scripts/refresh-post-image.ts <slug>");
    process.exit(1);
  }

  const [post] = await db
    .select({ id: posts.id, amazonUrl: posts.amazonUrl, imageUrl: posts.imageUrl })
    .from(posts)
    .where(eq(posts.slug, slug))
    .limit(1);

  if (!post) {
    console.error("Post not found");
    process.exit(1);
  }

  const resolved = await resolveAmazonProductImageUrlWithRetry(post.amazonUrl);
  console.log("before:", post.imageUrl);
  console.log("after:", resolved);

  if (resolved) {
    await db
      .update(posts)
      .set({ imageUrl: resolved, updatedAt: new Date().toISOString() })
      .where(eq(posts.id, post.id));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
