/** Minimum body length (characters) required before a review can be published. */
export const MIN_PUBLISH_BODY_CHARS = 300;

export type PublishQualityInput = {
  body: string;
  faqs: Array<{ q: string; a: string }>;
  specs: Record<string, string>;
};

export type PublishChecklistInput = PublishQualityInput & {
  title?: string | null;
  excerpt?: string | null;
  categoryId?: string | null;
  rating?: number | string | null;
  pros?: string[];
  cons?: string[];
  verdict?: string | null;
  amazonUrl?: string | null;
  imageUrl?: string | null;
};

export type PublishChecklistItem = {
  id:
    | "title"
    | "excerpt"
    | "body-depth"
    | "category"
    | "rating"
    | "pros-cons"
    | "verdict"
    | "affiliate-link"
    | "image"
    | "rich-results"
    | "no-placeholders";
  label: string;
  ok: boolean;
  detail: string;
  blocking: boolean;
};

const PLACEHOLDER_PATTERN = /\b(?:todo|tbd|placeholder|lorem ipsum|as an ai|ai language model)\b/i;

function hasText(value: string | null | undefined, min = 1) {
  return (value ?? "").trim().length >= min;
}

function hasValidUrl(value: string | null | undefined) {
  if (!value?.trim()) return false;
  try {
    new URL(value.trim());
    return true;
  } catch {
    return false;
  }
}

function hasFaq(faqs: Array<{ q: string; a: string }>) {
  return faqs.some((f) => f.q?.trim() && f.a?.trim());
}

function hasSpec(specs: Record<string, string>) {
  return Object.entries(specs).some(
    ([key, value]) => key.trim() && String(value).trim(),
  );
}

export function buildPublishChecklist(input: PublishChecklistInput): PublishChecklistItem[] {
  const bodyLength = input.body.trim().length;
  const rating = input.rating == null || input.rating === "" ? null : Number(input.rating);
  const textToScan = [input.title, input.excerpt, input.body, input.verdict]
    .filter(Boolean)
    .join("\n");
  const richResultsReady = hasFaq(input.faqs) || hasSpec(input.specs);

  return [
    {
      id: "title",
      label: "Title is specific",
      ok: hasText(input.title, 12),
      detail: "Use a product-specific title, not a placeholder.",
      blocking: true,
    },
    {
      id: "excerpt",
      label: "Excerpt is ready",
      ok: hasText(input.excerpt, 40),
      detail: "Add a concise shopper-focused summary for search and cards.",
      blocking: true,
    },
    {
      id: "body-depth",
      label: "Body has enough depth",
      ok: bodyLength >= MIN_PUBLISH_BODY_CHARS,
      detail: `${bodyLength}/${MIN_PUBLISH_BODY_CHARS} minimum body characters.`,
      blocking: true,
    },
    {
      id: "category",
      label: "Category selected",
      ok: hasText(input.categoryId),
      detail: "Choose a category so the review appears in navigation and roundups.",
      blocking: true,
    },
    {
      id: "rating",
      label: "Rating set",
      ok: rating != null && !Number.isNaN(rating) && rating >= 0 && rating <= 5,
      detail: "Set a 0–5 Verdict score.",
      blocking: true,
    },
    {
      id: "pros-cons",
      label: "Pros and cons present",
      ok: Boolean(input.pros?.some((p) => p.trim())) && Boolean(input.cons?.some((c) => c.trim())),
      detail: "Add at least one pro and one con for reader trust.",
      blocking: true,
    },
    {
      id: "verdict",
      label: "Quick verdict written",
      ok: hasText(input.verdict, 20),
      detail: "Add a short bottom-line recommendation.",
      blocking: true,
    },
    {
      id: "affiliate-link",
      label: "Affiliate/product link present",
      ok: hasValidUrl(input.amazonUrl),
      detail: "Add a valid Amazon/product URL before publishing.",
      blocking: true,
    },
    {
      id: "image",
      label: "Hero image available",
      ok: hasValidUrl(input.imageUrl),
      detail: "Add or fetch a hero image for the review card and social preview.",
      blocking: false,
    },
    {
      id: "rich-results",
      label: "FAQ or specs included",
      ok: richResultsReady,
      detail: "Add at least one FAQ or spec to support rich results.",
      blocking: true,
    },
    {
      id: "no-placeholders",
      label: "No obvious AI/placeholders",
      ok: !PLACEHOLDER_PATTERN.test(textToScan),
      detail: "Remove TODO/TBD/placeholder or AI-disclaimer language.",
      blocking: true,
    },
  ];
}

/**
 * Gate applied before a post is published. Returns a user-facing error message
 * when the content is too thin to rank, or null when it is publishable. Drafts
 * (unpublished posts) are never gated so work-in-progress can always be saved.
 */
export function checkPublishQuality(input: PublishQualityInput): string | null {
  const bodyLength = input.body.trim().length;
  if (bodyLength < MIN_PUBLISH_BODY_CHARS) {
    return `Add more detail before publishing — the body is ${bodyLength} characters but at least ${MIN_PUBLISH_BODY_CHARS} are needed to rank.`;
  }

  if (!hasFaq(input.faqs) && !hasSpec(input.specs)) {
    return "Add at least one FAQ or one spec before publishing so the review has enough depth to earn rich results.";
  }

  return null;
}

export function firstBlockingChecklistIssue(input: PublishChecklistInput): string | null {
  const issue = buildPublishChecklist(input).find((item) => item.blocking && !item.ok);
  return issue ? `${issue.label}: ${issue.detail}` : null;
}
