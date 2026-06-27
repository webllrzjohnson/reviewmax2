import Link from "next/link";
import { GitCompare } from "lucide-react";
import type { PostWithCategory } from "@/types";
import { canonicalPair } from "@/lib/compare-pairs";

export function CompareWithLinks({
  post,
  related,
}: {
  post: PostWithCategory;
  related: PostWithCategory[];
}) {
  if (related.length === 0) return null;

  return (
    <section
      className="rounded-xl border bg-muted/30 p-5"
      aria-labelledby="compare-with-heading"
    >
      <div className="flex items-center gap-2">
        <GitCompare className="h-5 w-5 text-primary" aria-hidden />
        <h2 id="compare-with-heading" className="text-lg font-bold">
          Compare with
        </h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        See how this product stacks up against others in{" "}
        {post.category?.name ?? "the same category"}.
      </p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {related.map((other) => (
          <li key={other.id}>
            <Link
              href={`/compare/${canonicalPair(post.slug, other.slug)}`}
              className="inline-flex max-w-full items-center rounded-full border bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <span className="line-clamp-1">{other.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
