/** Minimum body length (characters) required before a review can be published. */
export const MIN_PUBLISH_BODY_CHARS = 300;

export type PublishQualityInput = {
  body: string;
  faqs: Array<{ q: string; a: string }>;
  specs: Record<string, string>;
};

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

  const hasFaq = input.faqs.some((f) => f.q?.trim() && f.a?.trim());
  const hasSpec = Object.entries(input.specs).some(
    ([key, value]) => key.trim() && String(value).trim(),
  );
  if (!hasFaq && !hasSpec) {
    return "Add at least one FAQ or one spec before publishing so the review has enough depth to earn rich results.";
  }

  return null;
}
