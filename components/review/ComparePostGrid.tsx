"use client";

import { useState } from "react";
import Link from "next/link";
import { GitCompare } from "lucide-react";
import type { PostWithCategory } from "@/types";
import { ReviewCard } from "@/components/review/ReviewCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { canonicalPair } from "@/lib/compare-pairs";

const MAX_COMPARE = 2;

export function ComparePostGrid({
  posts,
  emptyTitle = "No reviews in this category yet.",
  emptyBody = "Check back soon for new guides.",
}: {
  posts: PostWithCategory[];
  emptyTitle?: string;
  emptyBody?: string;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggleSlug(slug: string) {
    setSelected((current) => {
      if (current.includes(slug)) {
        return current.filter((s) => s !== slug);
      }
      if (current.length >= MAX_COMPARE) {
        return [current[1]!, slug];
      }
      return [...current, slug];
    });
  }

  const compareHref =
    selected.length === MAX_COMPARE
      ? `/compare/${canonicalPair(selected[0]!, selected[1]!)}`
      : null;

  if (posts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 p-12 text-center">
        <p className="font-medium">{emptyTitle}</p>
        <p className="mt-2 text-sm text-muted-foreground">{emptyBody}</p>
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-muted-foreground">
        Select two reviews to compare side by side.{" "}
        <Link href="/compare" className="underline underline-offset-2 hover:text-foreground">
          Browse all products
        </Link>{" "}
        to compare across the full catalog.
      </p>
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {posts.map((post) => {
          const isSelected = selected.includes(post.slug);
          return (
            <div key={post.id} className="relative">
              <ReviewCard post={post} />
              <button
                type="button"
                onClick={() => toggleSlug(post.slug)}
                aria-pressed={isSelected}
                className={cn(
                  "absolute right-3 top-3 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm transition-colors",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background/95 text-foreground hover:border-primary/50",
                )}
              >
                {isSelected ? "Selected" : "Compare"}
              </button>
            </div>
          );
        })}
      </div>

      {selected.length > 0 && (
        <div className="sticky bottom-4 z-30 mx-auto flex max-w-lg flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/95 p-4 shadow-lg backdrop-blur">
          <p className="text-sm font-medium">
            {selected.length} of {MAX_COMPARE} selected
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelected([])}
            >
              Clear
            </Button>
            {compareHref ? (
              <Button size="sm" asChild>
                <Link href={compareHref}>
                  <GitCompare className="h-4 w-4" aria-hidden />
                  Compare now
                </Link>
              </Button>
            ) : (
              <Button size="sm" disabled>
                Pick one more
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
