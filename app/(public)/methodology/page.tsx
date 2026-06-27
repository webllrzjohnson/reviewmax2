import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/layout/PublicShell";
import { siteUrl } from "@/lib/utils";

const path = "/methodology";

export async function generateMetadata(): Promise<Metadata> {
  const url = `${siteUrl()}${path}`;
  const title = "How We Test & Review — Verdict";
  const description =
    "Our review methodology: how products are selected, researched, rated, and published — and how AI tooling fits into that process.";
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

export const revalidate = 86400;

export default function MethodologyPage() {
  return (
    <PublicShell>
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <h1>How We Test &amp; Review</h1>
        <p className="lead">
          Verdict exists to give you a clear, honest answer to one question: is
          this product worth buying? Here is exactly how we arrive at that
          answer.
        </p>

        <h2>Product selection</h2>
        <p>
          We cover products that have meaningful Amazon presence — sufficient
          reviews, clear specifications, and a real purchase path. Topics come
          from three sources:
        </p>
        <ul>
          <li>
            <strong>Reader requests</strong> submitted through our{" "}
            <Link href="/suggest">suggest a review</Link> form.
          </li>
          <li>
            <strong>Category gaps</strong> — we map which product segments are
            underserved and fill in the most-searched items first.
          </li>
          <li>
            <strong>Seasonal relevance</strong> — high-interest items aligned
            with buying seasons (back-to-school, holiday, etc.).
          </li>
        </ul>
        <p>
          Being selected does <em>not</em> guarantee a favorable review. Products
          that score poorly are published as-is; a low verdict is still useful
          information for readers.
        </p>

        <h2>Research process</h2>
        <p>
          Each review synthesizes multiple data sources to build a complete
          picture of the product:
        </p>
        <ul>
          <li>
            <strong>Manufacturer specifications</strong> — official spec sheets,
            product page copy, and declared performance figures.
          </li>
          <li>
            <strong>Amazon customer reviews</strong> — patterns across verified
            purchase reviews, with attention to recurring complaints and
            long-term durability reports.
          </li>
          <li>
            <strong>Third-party testing data</strong> — published benchmarks,
            lab results, and expert reviews from category-specialist outlets
            where available.
          </li>
          <li>
            <strong>Price and value context</strong> — how the product sits
            relative to direct competitors at the same price point.
          </li>
        </ul>

        <h2>How AI tooling fits in</h2>
        <p>
          Verdict uses an AI-assisted drafting pipeline to organize research
          into structured draft reviews. The AI handles
          formatting — summarizing pros and cons, drafting a verdict sentence,
          suggesting a star rating — based on the source data fed to it.
        </p>
        <p>
          Every published review is checked for internal consistency: the pros,
          cons, rating, verdict, and Amazon link must align. We verify that
          claims in the body are supported by the underlying sources before
          publishing. AI output is a starting point, not a final product.
        </p>

        <h2>Star ratings</h2>
        <p>
          Ratings are on a 1–5 scale. We apply them consistently across
          categories using these benchmarks:
        </p>
        <ul>
          <li>
            <strong>5.0</strong> — Exceptional. Best-in-class at its price or
            overall. Very few meaningful drawbacks.
          </li>
          <li>
            <strong>4.0–4.9</strong> — Good to excellent. Strong performer with
            minor tradeoffs that most buyers can live with.
          </li>
          <li>
            <strong>3.0–3.9</strong> — Average. Does the job but faces real
            competition at the same price; tradeoffs are worth noting.
          </li>
          <li>
            <strong>2.0–2.9</strong> — Below average. Noticeable flaws that
            affect everyday use. There are better options available.
          </li>
          <li>
            <strong>1.0–1.9</strong> — Poor. Significant quality or value
            problems. Hard to recommend.
          </li>
        </ul>

        <h2>Affiliate links &amp; independence</h2>
        <p>
          Verdict participates in the Amazon Associates program. Links to Amazon
          on this site may include our affiliate tracking tag; when you buy
          qualifying items after clicking, we may earn a commission at no extra
          cost to you.
        </p>
        <p>
          Affiliate income does not influence ratings or verdicts. Products are
          assessed on their merits. For the full FTC-compliant disclosure, read
          our{" "}
          <Link href="/affiliate-disclosure">affiliate disclosure page</Link>.
        </p>

        <h2>Keeping reviews current</h2>
        <p>
          Prices on Amazon change frequently. Each review displays the price at
          the time it was written as a reference point; always confirm the
          current price on the product page before purchasing. When a product
          receives a meaningful update — a new generation, a significant price
          shift, or a quality change flagged by reader feedback — we revisit and
          update the review. Updated reviews show a &quot;Updated [date]&quot;
          dateline.
        </p>

        <h2>Contact &amp; corrections</h2>
        <p>
          If you spot an error, outdated information, or want to suggest a
          product for review, use our{" "}
          <Link href="/contact">contact page</Link>. We take corrections
          seriously and update reviews promptly when warranted.
        </p>
      </article>
    </PublicShell>
  );
}
