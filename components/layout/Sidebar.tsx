import Link from "next/link";
import { GitCompare, Lightbulb } from "lucide-react";
import { getCategoriesWithPublishedPosts, getPopularPosts } from "@/lib/data";
import { Separator } from "@/components/ui/separator";
import { categoryIconForSlug } from "@/lib/category-icons";
import { RecentlyCompared } from "@/components/common/RecentlyCompared";
import { getFeaturedCategories } from "@/lib/ux-improvements";

export async function Sidebar() {
  const [categories, popular] = await Promise.all([
    getCategoriesWithPublishedPosts(),
    getPopularPosts(5),
  ]);
  const featuredCategories = getFeaturedCategories(categories, 10);

  return (
    <div className="space-y-6 rounded-lg border bg-card p-4 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Popular reviews</h2>
        <ul className="mt-3 space-y-3">
          {popular.map((p) => (
            <li key={p.id}>
              <Link href={`/blog/${p.slug}`} className="line-clamp-2 text-sm font-medium hover:underline">
                {p.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <Separator />
      <div className="space-y-3">
        <Link href="/compare" className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2.5 text-sm font-medium transition-colors hover:border-primary/30 hover:bg-primary/5">
          <GitCompare className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          Compare two products
        </Link>
        <p className="text-xs text-muted-foreground">Pick two reviews in the same category for a side-by-side breakdown.</p>
      </div>
      <Separator />
      <div className="grid gap-3">
        <Link href="/best" className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2.5 text-sm font-medium transition-colors hover:border-primary/30 hover:bg-primary/5">
          <span aria-hidden>🏆</span>
          Best-of guides
        </Link>
        <Link href="/suggest" className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2.5 text-sm font-medium transition-colors hover:border-primary/30 hover:bg-primary/5">
          <Lightbulb className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          Suggest a review
        </Link>
      </div>
      <RecentlyCompared />
      <Separator />
      <div>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Categories</h2>
          {categories.length > featuredCategories.length ? (
            <Link href="/#categories" className="text-xs font-medium text-primary hover:underline">View all</Link>
          ) : null}
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          {featuredCategories.map((c) => {
            const Icon = categoryIconForSlug(c.slug);
            return (
              <li key={c.id}>
                <Link href={`/category/${c.slug}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground hover:underline">
                  <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                  <span className="line-clamp-1">{c.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
