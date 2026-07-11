export const AI_GENERATION_SETTINGS_ID = "default";

export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-6";
export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

export const DEFAULT_REVIEW_SYSTEM_PROMPT = `You write honest Amazon affiliate product reviews for Verdict.
Return ONLY valid JSON (no markdown fences) matching this schema:
{
  "title": "string",
  "excerpt": "1-2 sentences",
  "body": "markdown article, 500-900 words. Include a '## Who it's for' section and a '## Who should skip it' section, a paragraph comparing it to typical alternatives in its category, and 1-2 inline markdown links to the product using the exact Amazon URL from the user message (descriptive anchor text such as the product name or 'check the current price', never 'click here').",
  "rating": 0-5 number with one decimal,
  "pros": ["string", ...],
  "cons": ["string", ...],
  "verdict": "2-4 sentence summary",
  "faqs": [{ "q": "common buyer question", "a": "concise answer" }, ...],
  "specs": { "Spec name": "value", ... }
}
Provide 3-5 FAQs that match the questions real shoppers search for (People Also Ask style).
Provide 4-8 key specs (e.g. material, dimensions, weight, power, warranty) as a flat object of string values; omit any you cannot reasonably infer rather than guessing wildly.
For product links, use ONLY the exact Amazon URL given in the user message - do not invent, shorten, or modify URLs, and do not append a tracking tag (the site adds the affiliate tag automatically).
Do not invent fake test results; write a plausible editorial tone grounded in the product's listed features.
Product images are fetched from Amazon when the review is published - do not include an image URL.`;

type EnvLike = Record<string, string | undefined>;

export type AiGenerationSettingsInput = {
  anthropicModel: string | null;
  openaiModel: string | null;
  reviewSystemPrompt: string | null;
};

export type AiGenerationSettingsConfig = {
  anthropicModel: string;
  openaiModel: string;
  reviewSystemPrompt: string;
};

export function normalizeAiSettingsInput(input: {
  anthropicModel: string | null;
  openaiModel: string | null;
  reviewSystemPrompt: string | null;
}): AiGenerationSettingsInput {
  return {
    anthropicModel: input.anthropicModel?.trim() || null,
    openaiModel: input.openaiModel?.trim() || null,
    reviewSystemPrompt: input.reviewSystemPrompt?.trim() || DEFAULT_REVIEW_SYSTEM_PROMPT,
  };
}

export function mergeAiGenerationSettingsWithEnv(
  settings: AiGenerationSettingsInput | null,
  env: EnvLike,
): AiGenerationSettingsConfig {
  return {
    anthropicModel:
      settings?.anthropicModel?.trim() ||
      env.ANTHROPIC_MODEL?.trim() ||
      DEFAULT_ANTHROPIC_MODEL,
    openaiModel:
      settings?.openaiModel?.trim() ||
      env.OPENAI_MODEL?.trim() ||
      DEFAULT_OPENAI_MODEL,
    reviewSystemPrompt:
      settings?.reviewSystemPrompt?.trim() || DEFAULT_REVIEW_SYSTEM_PROMPT,
  };
}

export function buildReviewGenerationPrompt(params: {
  productName: string;
  categorySlug: string;
  amazonUrl: string;
  notes: string | null;
}) {
  return `Product: ${params.productName}
Category slug: ${params.categorySlug}
Amazon URL: ${params.amazonUrl}
${params.notes ? `Editor notes: ${params.notes}` : ""}`;
}
