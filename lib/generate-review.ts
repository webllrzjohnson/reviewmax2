import OpenAI from "openai";
import { z } from "zod";
import {
  expandAmazonProductUrl,
  resolveAmazonProductImageUrl,
} from "@/lib/amazon-image";
import { coerceProductImageUrl } from "@/lib/image-url";
import { parseJsonLoose } from "@/lib/parse-json";

/** Shape the model is asked to return; validated before we trust any field. */
export const GeneratedReviewSchema = z.object({
  title: z.string().min(1).max(500),
  excerpt: z.string().min(1).max(2000),
  body: z.string().min(1),
  rating: z.number().min(0).max(5),
  pros: z.array(z.string().min(1)).min(1),
  cons: z.array(z.string().min(1)).min(1),
  verdict: z.string().min(1).max(2000),
});

export type GeneratedReview = z.infer<typeof GeneratedReviewSchema>;

/** A draft ready to insert into the `posts` table. */
export type GeneratedReviewDraft = {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  categorySlug: string;
  rating: number;
  pros: string[];
  cons: string[];
  verdict: string;
  amazonUrl: string;
  imageUrl: string | null;
};

export type GenerateReviewResult =
  | { ok: true; draft: GeneratedReviewDraft; model: "claude" | "openai" }
  | { ok: false; message: string };

const CLAUDE_MODEL = "claude-sonnet-4-20250514";
const OPENAI_MODEL = "gpt-4o-mini";

export async function generateReviewDraft(params: {
  product_name: string;
  category_slug: string;
  amazon_url: string;
  notes: string | null;
  image_url?: string | null;
}): Promise<GenerateReviewResult> {
  const hasClaude = Boolean(process.env.ANTHROPIC_API_KEY);
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);

  if (!hasClaude && !hasOpenAI) {
    return {
      ok: false,
      message:
        "No AI key configured. Set ANTHROPIC_API_KEY (primary) and/or OPENAI_API_KEY (fallback) to generate reviews.",
    };
  }

  const amazonUrl = await expandAmazonProductUrl(params.amazon_url);

  const slugBase = params.product_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  const slug = `${slugBase || "product"}-${Date.now().toString(36)}`;

  const system = `You write honest Amazon affiliate product reviews for Verdict.
Return ONLY valid JSON (no markdown fences) matching this schema:
{
  "title": "string",
  "excerpt": "1-2 sentences",
  "body": "markdown article, 400-800 words",
  "rating": 0-5 number with one decimal,
  "pros": ["string", ...],
  "cons": ["string", ...],
  "verdict": "2-4 sentence summary"
}
Do not invent fake test results; write a plausible editorial tone.
Product images are fetched from Amazon when the review is published - do not include an image URL.`;

  const user = `Product: ${params.product_name}
Category slug: ${params.category_slug}
Amazon URL: ${amazonUrl}
${params.notes ? `Editor notes: ${params.notes}` : ""}`;

  const providers: Array<"claude" | "openai"> = [];
  if (hasClaude) providers.push("claude");
  if (hasOpenAI) providers.push("openai");

  let lastError = "AI generation failed. Try again.";

  for (const provider of providers) {
    let raw = "";
    try {
      raw =
        provider === "claude"
          ? await callClaude(system, user)
          : await callOpenAI(system, user);
    } catch (error) {
      console.error(`generateReviewDraft: ${provider} request failed`, error);
      lastError =
        provider === "claude" && providers.includes("openai")
          ? "Claude failed; trying fallback."
          : "AI request failed. Try again.";
      continue;
    }

    if (!raw.trim()) {
      lastError = "AI returned an empty response.";
      continue;
    }

    const parsedJson = parseJsonLoose(raw);
    if (parsedJson === undefined) {
      lastError = "AI did not return valid JSON.";
      continue;
    }

    const result = GeneratedReviewSchema.safeParse(parsedJson);
    if (!result.success) {
      console.error(
        `generateReviewDraft: ${provider} output validation failed`,
        result.error.flatten(),
      );
      lastError = "AI response did not match the expected review format.";
      continue;
    }

    const review = result.data;
    const passthroughImage = coerceProductImageUrl(params.image_url);
    const imageUrl =
      passthroughImage ?? (await resolveAmazonProductImageUrl(amazonUrl));

    return {
      ok: true,
      model: provider,
      draft: {
        title: review.title.slice(0, 500),
        slug,
        excerpt: review.excerpt.slice(0, 2000),
        body: review.body,
        categorySlug: params.category_slug,
        rating: review.rating,
        pros: review.pros,
        cons: review.cons,
        verdict: review.verdict.slice(0, 2000),
        amazonUrl,
        imageUrl,
      },
    };
  }

  return {
    ok: false,
    message:
      providers.length > 1
        ? "AI generation failed (Claude and fallback). Try again."
        : lastError,
  };
}

async function callClaude(system: string, user: string): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Claude ${response.status}: ${text.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    content?: Array<{ text?: string }>;
  };
  return data.content?.[0]?.text ?? "";
}

async function callOpenAI(system: string, user: string): Promise<string> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
    max_tokens: 4096,
    temperature: 0.6,
  });
  return response.choices[0]?.message?.content ?? "";
}
