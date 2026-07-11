import { deriveBrand, parsePrice } from "@/lib/product-meta";

type ReviewSchemaPost = {
  title: string;
  slug: string;
  excerpt: string;
  verdict: string;
  amazon_url?: string | null;
  image_url?: string | null;
  rating?: number | null;
  price_at_review?: string | null;
  published_at?: string | null;
  updated_at?: string | null;
  specs?: Record<string, string> | null;
  faqs?: Array<{ q: string; a: string }> | null;
  category?: { name: string; slug: string } | null;
};

export type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | JsonLdNode
  | JsonLdValue[];

export type JsonLdNode = { [key: string]: JsonLdValue };

const FALLBACK_IMAGE = "https://placehold.co/1200x630/e2e8f0/64748b?text=Product";

function trimSiteUrl(value: string) {
  return value.replace(/\/$/, "");
}

export function buildReviewJsonLd(
  post: ReviewSchemaPost,
  baseUrl: string,
): JsonLdNode[] {
  const origin = trimSiteUrl(baseUrl);
  const url = `${origin}/blog/${post.slug}`;
  const image = post.image_url ? [post.image_url] : [FALLBACK_IMAGE];
  const authorLd = { "@type": "Organization", name: "Verdict" };
  const publisherLd = { "@type": "Organization", name: "Verdict" };
  const brand = deriveBrand(post.title);
  const parsedPrice = parsePrice(post.price_at_review ?? null);
  const specEntries = Object.entries(post.specs ?? {}).filter(
    ([key, value]) => key.trim() && String(value).trim(),
  );
  const faqs = (post.faqs ?? []).filter((f) => f.q.trim() && f.a.trim());

  const reviewNode: JsonLdNode = {
    "@type": "Review",
    reviewRating: {
      "@type": "Rating",
      ratingValue: post.rating ?? undefined,
      bestRating: 5,
      worstRating: 0,
    },
    author: authorLd,
    publisher: publisherLd,
    datePublished: post.published_at ?? undefined,
    reviewBody: post.verdict,
  };

  const productLd: JsonLdNode = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: post.title,
    image,
    description: post.excerpt,
    ...(brand ? { brand: { "@type": "Brand", name: brand } } : {}),
    ...(specEntries.length > 0
      ? {
          additionalProperty: specEntries.map(([name, value]) => ({
            "@type": "PropertyValue",
            name,
            value,
          })),
        }
      : {}),
    ...(post.amazon_url
      ? {
          offers: {
            "@type": "Offer",
            url: post.amazon_url,
            availability: "https://schema.org/InStock",
            ...(parsedPrice
              ? {
                  price: parsedPrice.price,
                  priceCurrency: parsedPrice.priceCurrency,
                }
              : {}),
          },
        }
      : {}),
    review: reviewNode,
    ...(post.rating != null
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: post.rating,
            bestRating: 5,
            worstRating: 0,
            reviewCount: 1,
          },
        }
      : {}),
  };

  const articleLd: JsonLdNode = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.published_at ?? undefined,
    dateModified: post.updated_at ?? post.published_at ?? undefined,
    image,
    author: authorLd,
    publisher: publisherLd,
    mainEntityOfPage: url,
  };

  const faqLd: JsonLdNode | null = faqs.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }
    : null;

  const breadcrumbLd: JsonLdNode = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: origin },
      { "@type": "ListItem", position: 2, name: "Reviews", item: `${origin}/blog` },
      ...(post.category
        ? [
            {
              "@type": "ListItem",
              position: 3,
              name: post.category.name,
              item: `${origin}/category/${post.category.slug}`,
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: post.category ? 4 : 3,
        name: post.title,
        item: url,
      },
    ],
  };

  return [productLd, articleLd, ...(faqLd ? [faqLd] : []), breadcrumbLd];
}
