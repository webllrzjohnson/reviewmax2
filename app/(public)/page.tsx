import Link from "next/link";
import { CheckCircle2, GitCompare, Search, Trophy } from "lucide-react";
import type { Metadata } from "next";
import { PublicShell } from "@/components/layout/PublicShell";
import { siteUrl } from "@/lib/utils";
import {
  getCategoriesWithPublishedPosts,
  getPopularPosts,
  getPublishedPosts,
} from "@/lib/data";
import { ReviewCard } from "@/components/review/ReviewCard";
import { NewsletterSignup } from "@/components/common/NewsletterSignup";
import { RecentlyViewed } from "@/components/common/RecentlyViewed";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { categoryIconForSlug } from "@/lib/category-icons";
import { categoryAccentForSlug, formatCategoryList } from "@/lib/category-colors";
import { cn } from "@/lib/utils";
import { getFeaturedCategories, TRUST_SIGNALS } from "@/lib/ux-improvements";

export async function generateMetadata(): Promise<Metadata> {
  const categories = await getCategoriesWithPublishedPosts();
  const categoryNames = categories.map((c) => c.name);
  const topics = formatCategoryList(categoryNames.slice(0, 8));

  const title = "Verdict — Unbiased Product Reviews & Buying Guides";
  const description =
    categoryNames.length > 0
      ? `Clear pros, cons, ratings, and comparisons across ${topics}. Smarter buying decisions, without the fluff.`
      : "Clear pros, cons, ratings, and comparisons to help you buy smarter—without the fluff.";
  const url = siteUrl();
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export const revalidate = 3600;

export default async function HomePage() {
  const [orderedPosts, activeCategories, popularPosts] = await Promise.all([
    getPublishedPosts(10),
    getCategoriesWithPublishedPosts(),
    getPopularPosts(8),
  ]);

  const homepagePosts = orderedPosts.slice(0, 10);
  const homepageIds = new Set(homepagePosts.map((p) => p.id));
  const topRatedDeduped = popularPosts.filter((p) => !homepageIds.has(p.id));
  const topRated = topRatedDeduped.length > 0 ? topRatedDeduped.slice(0, 4) : popularPosts.slice(0, 4);
  const featuredCategories = getFeaturedCategories(activeCategories, 8);
  const hiddenCategoryCount = Math.max(activeCategories.length - featuredCategories.length, 0);

  return (
    <PublicShell>
      <div className="space-y-12 sm:space-y-16">
        <section className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/8 via-card to-card px-5 py-14 sm:px-10 sm:py-20">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <span className="inline-block rounded-full bg-primary px-4 py-1 text-xs font-semibold uppercase tracking-widest text-primary-foreground">
              Verdict
            </span>
            <h1 className="mt-5 font-heading text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              Unbiased reviews for smarter buying decisions
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
              Clear pros, cons, ratings, and side-by-side comparisons so you can buy with confidence—without the fluff.
            </p>
            {activeCategories.length > 0 ? (
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                {activeCategories.slice(0, 6).map((category) => (
                  <Link
                    key={category.id}
                    href={`/category/${category.slug}`}
                    className="rounded-full border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:border-primary/30 hover:text-foreground"
                  >
                    {category.name}
                  </Link>
                ))}
                <a href="#categories" className="text-xs font-semibold text-primary hover:underline">
                  View all categories
                </a>
              </div>
            ) : null}
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/blog">
                  <Search className="h-4 w-4" aria-hidden />
                  Search reviews
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full border-primary/30 sm:w-auto hover:bg-primary/5">
                <Link href="/compare">
                  <GitCompare className="h-4 w-4" aria-hidden />
                  Compare products
                </Link>
              </Button>
            </div>
            <div className="mx-auto mt-8 grid max-w-2xl gap-2 rounded-2xl border bg-background/70 p-3 text-left shadow-sm sm:grid-cols-2">
              {TRUST_SIGNALS.map((signal) => (
                <div key={signal} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" aria-hidden />
                  <span>{signal}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6" aria-labelledby="compare-home-heading">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="rounded-2xl bg-primary/10 p-3 text-primary">
                <GitCompare className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h2 id="compare-home-heading" className="font-heading text-xl font-bold tracking-tight">
                  Compare before you buy
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Pick two reviews in the same category and see ratings, pros, cons, price context, and best-use cases side by side.
                </p>
              </div>
            </div>
            <Button asChild className="shrink-0">
              <Link href="/compare">Start a comparison</Link>
            </Button>
          </div>
        </section>

        {topRated.length > 0 && (
          <section className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" aria-hidden />
                  <h2 className="font-heading text-2xl font-bold tracking-tight">Top rated</h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Highest-scoring reviews across every category</p>
              </div>
              <Link href="/blog" className="text-sm font-medium text-primary hover:underline">View all</Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {topRated.map((post) => (
                <ReviewCard key={post.id} post={post} highlight="top-rated" imageSizes="(max-width:768px) 100vw, 25vw" />
              ))}
            </div>
          </section>
        )}

        {featuredCategories.length > 0 && (
          <section id="categories" className="scroll-mt-20 space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-heading text-2xl font-bold tracking-tight">Popular categories</h2>
                <p className="mt-1 text-sm text-muted-foreground">Start with the topics readers use most, then browse the full archive.</p>
              </div>
              {hiddenCategoryCount > 0 ? (
                <span className="text-sm text-muted-foreground">Showing 8 of {activeCategories.length} categories</span>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {featuredCategories.map((c) => {
                const Icon = categoryIconForSlug(c.slug);
                const accent = categoryAccentForSlug(c.slug);
                return (
                  <Link
                    key={c.id}
                    href={`/category/${c.slug}`}
                    className={cn("group flex min-h-44 flex-col items-center justify-center gap-3 rounded-2xl border bg-card px-4 py-6 text-center transition-colors", accent.tile)}
                  >
                    <span className={cn("flex h-12 w-12 items-center justify-center rounded-2xl transition-colors", accent.tileIcon)}>
                      <Icon className="h-6 w-6" aria-hidden />
                    </span>
                    <span className="font-semibold leading-snug">{c.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {c.post_count} review{c.post_count === 1 ? "" : "s"}
                    </Badge>
                    {c.description ? <span className="line-clamp-2 text-xs text-muted-foreground">{c.description}</span> : null}
                  </Link>
                );
              })}
            </div>
            {activeCategories.some((c) => c.post_count >= 2) ? (
              <div className="flex justify-center">
                <Button asChild variant="outline"><Link href="/best">View best-of guides</Link></Button>
              </div>
            ) : null}
          </section>
        )}

        <section className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-heading text-2xl font-bold tracking-tight">Latest reviews</h2>
              <p className="mt-1 text-sm text-muted-foreground">Our newest picks, updated as we publish</p>
            </div>
            <Link href="/blog" className="text-sm font-medium text-primary hover:underline">View all</Link>
          </div>
          {homepagePosts.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {homepagePosts.map((post) => <ReviewCard key={post.id} post={post} />)}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed bg-muted/30 p-12 text-center">
              <p className="font-medium">No reviews published yet.</p>
              <p className="mt-2 text-sm text-muted-foreground">Check back soon for new product guides.</p>
            </div>
          )}
        </section>

        <RecentlyViewed />

        <section aria-labelledby="newsletter-heading">
          <h2 id="newsletter-heading" className="sr-only">Newsletter signup</h2>
          <NewsletterSignup variant="section" />
        </section>
      </div>
    </PublicShell>
  );
}
