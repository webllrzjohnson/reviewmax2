import type { Metadata } from "next";
import Link from "next/link";
import { getPostsForComparison, getPublishedPosts } from "@/lib/data";
import { CompareView } from "@/components/review/CompareView";
import { Button } from "@/components/ui/button";
import { siteUrl } from "@/lib/utils";
import {
  buildComparePairs,
  canonicalPair,
  parsePair,
} from "@/lib/compare-pairs";

export const revalidate = 3600;

type Props = { params: Promise<{ pair: string }> };

export async function generateStaticParams() {
  const posts = await getPublishedPosts(200);
  return buildComparePairs(posts).map((pair) => ({ pair }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pair } = await params;
  const parsed = parsePair(pair);
  if (!parsed) return { title: "Compare products" };

  const result = await getPostsForComparison(parsed.left, parsed.right);
  if (!result.ok) return { title: "Compare products" };

  const [a, b] = result.posts;
  const title = `${a.title} vs ${b.title}`;
  const base = siteUrl();
  const canonical = `${base}/compare/${canonicalPair(a.slug, b.slug)}`;
  const ogImageUrl = `${base}/api/og/compare?left=${encodeURIComponent(a.title)}&right=${encodeURIComponent(b.title)}${a.rating != null ? `&lr=${a.rating}` : ""}${b.rating != null ? `&rr=${b.rating}` : ""}${a.category?.name ? `&cat=${encodeURIComponent(a.category.name)}` : ""}`;

  return {
    title,
    description: `Compare ratings, pros, cons, specs, and verdicts for ${a.title} and ${b.title}.`,
    alternates: { canonical },
    openGraph: {
      title: `${title} | Verdict`,
      description: `Side-by-side comparison in ${a.category?.name ?? "the same category"}.`,
      url: canonical,
      type: "website",
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Verdict`,
      description: `Side-by-side comparison in ${a.category?.name ?? "the same category"}.`,
      images: [ogImageUrl],
    },
  };
}

const ERROR_COPY = {
  not_found: {
    title: "Reviews not found",
    body: "One or both products could not be found, or they may not be published yet.",
  },
  same_slug: {
    title: "Pick two different products",
    body: "A comparison needs two different products.",
  },
  different_category: {
    title: "Different categories",
    body: "Comparisons only work for products in the same category—for example, two watches or two blenders.",
  },
} as const;

export default async function ComparePairPage({ params }: Props) {
  const { pair } = await params;
  const parsed = parsePair(pair);

  const result = parsed
    ? await getPostsForComparison(parsed.left, parsed.right)
    : ({ ok: false, reason: "not_found" } as const);

  if (!result.ok) {
    const copy = ERROR_COPY[result.reason];
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-2xl border bg-card p-8 text-center">
        <h1 className="font-heading text-2xl font-bold">{copy.title}</h1>
        <p className="text-muted-foreground">{copy.body}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild variant="outline">
            <Link href="/compare">Build a comparison</Link>
          </Button>
          <Button asChild>
            <Link href="/blog">Browse reviews</Link>
          </Button>
        </div>
      </div>
    );
  }

  const [leftPost, rightPost] = result.posts;
  return <CompareView left={leftPost} right={rightPost} />;
}
