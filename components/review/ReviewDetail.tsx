import type { PostWithCategory } from "@/types";
import { ReviewCardImage } from "@/components/review/ReviewCardImage";
import { AnimatedRating } from "@/components/review/AnimatedRating";
import { ProsConsList } from "@/components/review/ProsConsList";
import { AffiliateButton } from "@/components/review/AffiliateButton";
import { StickyBuyBar } from "@/components/review/StickyBuyBar";
import { Badge } from "@/components/ui/badge";
import { RelatedPosts } from "@/components/review/RelatedPosts";
import { CompareWithLinks } from "@/components/review/CompareWithLinks";
import { PostBody } from "@/components/review/PostBody";
import { formatDate, siteUrl, wasUpdatedAfterPublish, cn } from "@/lib/utils";
import { categoryAccentForSlug } from "@/lib/category-colors";
import { getAuthorForPost } from "@/lib/authors";
import { getRelatedPosts } from "@/lib/data";
import { buildReviewJsonLd } from "@/lib/review-schema";
import { BreadcrumbNav } from "@/components/common/BreadcrumbNav";
import { ShareBar } from "@/components/common/ShareBar";
import { TableOfContents } from "@/components/review/TableOfContents";
import { extractHeadings } from "@/lib/extract-headings";
import { PostBadgeTag } from "@/components/review/PostBadge";
import { HelpfulFeedback } from "@/components/review/HelpfulFeedback";
import { FaqAccordion } from "@/components/review/FaqAccordion";
import { GalleryLightbox } from "@/components/review/GalleryLightbox";
import { SpecList } from "@/components/review/SpecList";
import { EvaluationNote } from "@/components/review/EvaluationNote";
import { buildReviewSummary } from "@/lib/review-summary";

export async function ReviewDetail({
  post,
}: {
  post: PostWithCategory;
}) {
  const related = await getRelatedPosts(post.category_id, post.slug, 8);
  const showUpdated = wasUpdatedAfterPublish(post.published_at, post.updated_at);
  const headings = extractHeadings(post.body);
  const accent = categoryAccentForSlug(post.category?.slug ?? "");
  const author = getAuthorForPost(post);
  const summary = buildReviewSummary({
    title: post.title,
    category: post.category,
    pros: post.pros,
    cons: post.cons,
    body: post.body,
    rating: post.rating,
  });

  return (
    <article className={cn("space-y-8", post.amazon_url ? "pb-24 sm:pb-28" : undefined)}>
      <BreadcrumbNav
        items={[
          { label: "Home", href: "/" },
          { label: "Reviews", href: "/blog" },
          ...(post.category
            ? [
                {
                  label: post.category.name,
                  href: `/category/${post.category.slug}`,
                },
              ]
            : []),
          { label: post.title, href: `/blog/${post.slug}` },
        ]}
      />

      <section className="flow-root">
        <figure className="mx-auto mb-6 w-full max-w-[280px] sm:float-right sm:mb-4 sm:ml-8 sm:w-64 lg:w-72">
          <div className="relative aspect-square overflow-hidden rounded-xl border bg-muted shadow-sm">
            <ReviewCardImage
              src={post.image_url}
              alt={post.title}
              sizes="(max-width: 640px) 280px, 288px"
              priority
              fit="contain"
            />
          </div>
        </figure>

        <header className="space-y-4">
          {post.category ? (
            <Badge className={cn("border shadow-sm", accent.badge)}>
              {post.category.name}
            </Badge>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              {post.title}
            </h1>
            <PostBadgeTag badge={post.badge} size="md" />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>
              By{" "}
              <a
                href={`/author/${author.slug}`}
                className="font-medium text-foreground underline-offset-2 hover:underline"
                rel="author"
              >
                {author.name}
              </a>
              <span className="text-muted-foreground">, {author.role}</span>
            </span>
            {post.published_at ? (
              <time dateTime={post.published_at}>
                Published {formatDate(post.published_at)}
              </time>
            ) : null}
            {showUpdated ? (
              <time dateTime={post.updated_at!}>
                Updated {formatDate(post.updated_at)}
              </time>
            ) : null}
            {post.amazon_url ? (
              <span>
                Contains{" "}
                <a
                  href="/affiliate-disclosure"
                  className="underline hover:text-foreground"
                >
                  affiliate links
                </a>
              </span>
            ) : null}
          </div>
          <AnimatedRating rating={post.rating} className="pt-2" />
        </header>

        <aside
          id="review-verdict"
          className="mt-6 rounded-xl border border-[#16A34A]/25 bg-[#16A34A]/5 p-5 dark:border-[#22C55E]/20 dark:bg-[#22C55E]/8"
          aria-labelledby="quick-verdict-heading"
        >
          <p
            id="quick-verdict-heading"
            className="text-sm font-semibold uppercase tracking-wide text-[#16A34A] dark:text-[#22C55E]"
          >
            Verdict
          </p>
          <p className="mt-3 text-base font-medium leading-relaxed">
            {post.verdict}
          </p>
          {post.amazon_url ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <AffiliateButton
                href_raw={post.amazon_url}
                postSlug={post.slug}
                label="Check price on Amazon"
                className="w-full sm:w-auto"
              />
              {post.price_at_review ? (
                <p className="text-xs text-muted-foreground">
                  Price at review:{" "}
                  <span className="font-semibold text-foreground">
                    {post.price_at_review}
                  </span>
                </p>
              ) : null}
            </div>
          ) : null}
        </aside>

        <section className="mt-6 grid gap-3 md:grid-cols-3" aria-label="Review summary">
          <SummaryTile label="Best for" value={summary.bestFor} />
          <SummaryTile label="Skip if" value={summary.skipIf} />
          <SummaryTile label="Standout" value={summary.standOut} />
        </section>
      </section>

      <ShareBar
        url={`${siteUrl()}/blog/${post.slug}`}
        title={`${post.title} — Verdict`}
        className="border-t pt-6"
      />

      <TableOfContents headings={headings} />

      <ProsConsList pros={post.pros} cons={post.cons} />

      <PostBody body={post.body} />

      <SpecList specs={post.specs} />

      <FaqAccordion faqs={post.faqs} />

      <AlternativesSection current={post} alternatives={related.slice(0, 3)} />

      <GalleryLightbox images={post.gallery_urls ?? []} title={post.title} />

      <section
        className="rounded-xl border-2 border-[#FF9900]/35 bg-gradient-to-br from-[#FF9900]/18 via-background to-background p-6 shadow-md dark:from-[#FF9900]/10"
        aria-labelledby="where-to-buy-heading"
      >
        <h2 id="where-to-buy-heading" className="text-xl font-bold">
          Where to buy
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We may earn a commission from qualifying purchases. See our{" "}
          <a href="/affiliate-disclosure" className="font-medium underline">
            affiliate disclosure
          </a>
          .
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <AffiliateButton
            href_raw={post.amazon_url}
            postSlug={post.slug}
            className="min-h-12 min-w-[220px] px-10 text-base shadow-md"
          />
        </div>
      </section>

      <EvaluationNote categoryName={post.category?.name} />

      <HelpfulFeedback postSlug={post.slug} />

      {post.category && related.length > 0 ? (
        <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-5 py-4">
          <div>
            <p className="text-sm font-semibold">
              See the best {post.category.name} picks
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Top-rated {post.category.name.toLowerCase()} ranked by our
              editorial team
            </p>
          </div>
          <a
            href={`/best/${post.category.slug}`}
            className="shrink-0 ml-4 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
          >
            View roundup →
          </a>
        </div>
      ) : null}

      <CompareWithLinks post={post} related={related} />

      <RelatedPosts posts={related.slice(0, 3)} />

      <JsonLd post={post} />

      {post.amazon_url ? (
        <StickyBuyBar
          postSlug={post.slug}
          amazonUrl={post.amazon_url}
          title={post.title}
          observeTargetId="review-verdict"
        />
      ) : null}
    </article>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium leading-relaxed">{value}</p>
    </div>
  );
}

function AlternativesSection({
  current,
  alternatives,
}: {
  current: PostWithCategory;
  alternatives: PostWithCategory[];
}) {
  if (alternatives.length === 0) return null;

  return (
    <section className="rounded-xl border bg-muted/20 p-5" aria-labelledby="alternatives-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Still deciding?
          </p>
          <h2 id="alternatives-heading" className="mt-1 text-xl font-bold">
            Best alternatives to compare
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            If {current.title} is not quite right, compare it with similar
            {current.category ? ` ${current.category.name.toLowerCase()}` : " products"} before buying.
          </p>
        </div>
        {current.category ? (
          <a
            href={`/best/${current.category.slug}`}
            className="rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            View all picks →
          </a>
        ) : null}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {alternatives.map((item) => (
          <a
            key={item.id}
            href={`/blog/${item.slug}`}
            className="rounded-lg border bg-background p-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <p className="line-clamp-2 text-sm font-semibold">{item.title}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {item.rating ? `${item.rating}/5` : "Review"}
              {item.pros[0] ? ` · ${item.pros[0]}` : ""}
            </p>
          </a>
        ))}
      </div>
    </section>
  );
}

function JsonLd({ post }: { post: PostWithCategory }) {
  const nodes = buildReviewJsonLd(post, siteUrl());

  return (
    <>
      {nodes.map((node) => (
        <script
          key={String(node["@type"])}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(node) }}
        />
      ))}
    </>
  );
}
