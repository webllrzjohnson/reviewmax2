import Link from "next/link";
import { Star } from "lucide-react";
import type { PostWithCategory } from "@/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReviewCardImage } from "@/components/review/ReviewCardImage";
import { PostBadgeTag } from "@/components/review/PostBadge";
import { formatDate, wasUpdatedAfterPublish, cn } from "@/lib/utils";
import { categoryAccentForSlug } from "@/lib/category-colors";

export function ReviewCard({
  post,
  imageSizes = "(max-width:768px) 100vw, 33vw",
  highlight,
}: {
  post: PostWithCategory;
  imageSizes?: string;
  highlight?: "top-rated";
}) {
  const slug = post.category?.slug ?? "";
  const accent = categoryAccentForSlug(slug);
  const rating = Number(post.rating ?? 0);
  const showUpdated = wasUpdatedAfterPublish(post.published_at, post.updated_at);

  return (
    <Card className={cn("group h-full overflow-hidden border-l-4 transition-all duration-200", accent.cardBorder, accent.cardHover)}>
      <Link href={`/blog/${post.slug}`} className="flex h-full flex-col">
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-muted via-muted/70 to-background">
          <ReviewCardImage src={post.image_url} alt={post.title} sizes={imageSizes} />
        </div>
        <CardHeader className="space-y-2 pb-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {post.category ? (
              <Badge className={cn("max-w-full border shadow-sm", accent.badge, accent.badgeHover)}>
                <span className="line-clamp-1">{post.category.name}</span>
              </Badge>
            ) : null}
            <PostBadgeTag badge={post.badge} />
            {highlight === "top-rated" ? (
              <Badge className="border-amber-400/50 bg-amber-500 text-white shadow-sm">Top rated</Badge>
            ) : null}
          </div>
          {post.rating != null && rating > 0 ? (
            <div className="inline-flex w-fit items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              <Star className="h-3.5 w-3.5 fill-[#C98B1A] text-[#C98B1A]" aria-hidden />
              <span className="tabular-nums">{rating.toFixed(1)} / 5</span>
              <span className="text-amber-700/80 dark:text-amber-200/80">Verdict score</span>
            </div>
          ) : null}
          <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug transition-colors group-hover:text-primary">
            {post.title}
          </h3>
          {showUpdated ? (
            <time dateTime={post.updated_at} className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              <span aria-hidden>↻</span> Updated {formatDate(post.updated_at)}
            </time>
          ) : post.published_at ? (
            <time dateTime={post.published_at} className="text-xs text-muted-foreground">
              {formatDate(post.published_at)}
            </time>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-1 flex-col">
          <p className="line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
          <span className="mt-auto inline-flex pt-4 text-sm font-semibold text-primary">
            Read review
            <span className="ml-1 transition-transform group-hover:translate-x-0.5" aria-hidden>→</span>
          </span>
        </CardContent>
      </Link>
    </Card>
  );
}
