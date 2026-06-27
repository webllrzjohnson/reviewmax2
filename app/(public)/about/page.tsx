import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/layout/PublicShell";
import { Button } from "@/components/ui/button";
import { siteUrl } from "@/lib/utils";

const path = "/about";

export async function generateMetadata(): Promise<Metadata> {
  const url = `${siteUrl()}${path}`;
  const title = "About Verdict";
  const description =
    "Verdict publishes independent Amazon product reviews: how topics are picked, editorial standards, and how affiliate links fund the site.";
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export const revalidate = 3600;

export default function AboutPage() {
  return (
    <PublicShell>
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <h1>About Verdict</h1>

        <h2>What Verdict is</h2>
        <p>
          Verdict is an editorial publication focused on practical product
          reviews and buying guides. Each article summarizes research into a
          specific product category or model, organizes findings into strengths
          and tradeoffs, assigns a concise star rating, and ends with a clear
          verdict so you can decide quickly whether something fits your needs.
          The site uses AI tooling on the backend to streamline drafting and
          formatting; published pages are plain
          web content you read in your browser—no signup required to browse
          reviews.
        </p>

        <h2>How reviews are selected</h2>
        <p>
          Topics come from several sources: requests submitted through the secure
          admin review-request workflow (authenticated operators only), category
          gaps we want to cover,
          and seasonal or high-interest items. Before a draft is finalized, work
          is checked for internal consistency—the pros, cons, rating, verdict,
          and Amazon link must align with what the piece states. Selection does
          <em>not</em> guarantee a favorable review; verdicts reflect the
          synthesized research for that SKU or comparison at the time of
          writing. Prices and availability on Amazon change frequently; always
          confirm details on the product page before you purchase.
        </p>

        <h2>Affiliate disclosure notice</h2>
        <p>
          Verdict is a participant in the Amazon Associates program. Links that
          go to Amazon on this site may include our tracking parameter; when
          you buy qualifying items after clicking, we may earn a commission at
          no additional cost to you. That arrangement helps pay hosting and tools
          but does not change the structure of our reviews—you still see
          explicit pros, cons, scores, and a bottom-line verdict. For the full,
          FTC-aligned disclosure written for Amazon Associates compliance, read{" "}
          <Link href="/affiliate-disclosure">Affiliate disclosure</Link>.
        </p>

        <Button asChild variant="outline">
          <Link href="/affiliate-disclosure">Read full affiliate disclosure</Link>
        </Button>
      </article>
    </PublicShell>
  );
}
