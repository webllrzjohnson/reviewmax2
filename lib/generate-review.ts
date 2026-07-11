import OpenAI from "openai";
import { z } from "zod";
import {
  expandAmazonProductUrl,
  resolveAmazonProductImageUrlWithRetry,
} from "@/lib/amazon-image";
import { coerceProductImageUrl } from "@/lib/image-url";
import { parseJsonLoose } from "@/lib/parse-json";
import { buildReviewGenerationPrompt } from "@/lib/ai-settings";

/** Shape the model is asked to return; validated before we trust any field. */
export const GeneratedReviewSchema = z.object({
  title: z.string().min(1).max(500),
  excerpt: z.string().min(1).max(2000),
  body: z.string().min(1),
  rating: z.number().min(0).max(5),
  pros: z.array(z.string().min(1)).min(1),
  cons: z.array(z.string().min(1)).min(1),
  verdict: z.string().min(1).max(2000),
  // FAQs and specs are optional in the contract so a model that omits or
  // malforms them never fails the whole generation; we sanitize them below.
  faqs: z
    .array(z.object({ q: z.string(), a: z.string() }))
    .default([])
    .catch([]),
  specs: z.record(z.string(), z.string()).default({}).catch({}),
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
  faqs: Array<{ q: string; a: string }>;
  specs: Record<string, string>;
  amazonUrl: string;
  imageUrl: string | null;
};

export type GenerateReviewResult =
  | { ok: true; draft: GeneratedReviewDraft; model: "claude" | "openai" }
  | { ok: false; message: string };

/** Coerce common model formatting mistakes before Zod validation. */
export function normalizeGeneratedReviewJson(input: unknown): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return input;
  }

  const obj = { ...(input as Record<string, unknown>) };

  if (typeof obj.rating === "string") {
    const parsed = Number.parseFloat(obj.rating);
    if (!Number.isNaN(parsed)) obj.rating = parsed;
  }

  for (const key of ["pros", "cons"] as const) {
    const value = obj[key];
    if (typeof value === "string") {
      obj[key] = value
        .split(/\n+/)
        .map((line) => line.replace(/^[-•*]\s*/, "").trim())
        .filter(Boolean);
    } else if (Array.isArray(value)) {
      obj[key] = value.map((item) => String(item ?? "").trim()).filter(Boolean);
    }
  }

  if (typeof obj.verdict !== "string" && obj.verdict != null) {
    obj.verdict = String(obj.verdict);
  }

  if (typeof obj.title !== "string" && obj.title != null) {
    obj.title = String(obj.title);
  }
  if (typeof obj.excerpt !== "string" && obj.excerpt != null) {
    obj.excerpt = String(obj.excerpt);
  }
  if (typeof obj.body !== "string" && obj.body != null) {
    obj.body = String(obj.body);
  }

  return obj;
}

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
  const { getAiGenerationSettingsConfig } = await import("@/lib/ai-settings-data");
  const aiSettings = await getAiGenerationSettingsConfig();

  const slugBase = params.product_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  const slug = `${slugBase || "product"}-${Date.now().toString(36)}`;

  const system = aiSettings.reviewSystemPrompt;
  const user = buildReviewGenerationPrompt({
    productName: params.product_name,
    categorySlug: params.category_slug,
    amazonUrl,
    notes: params.notes,
  });

  const providers: Array<"claude" | "openai"> = [];
  if (hasClaude) providers.push("claude");
  if (hasOpenAI) providers.push("openai");

  let lastError = "AI generation failed. Try again.";

  for (const provider of providers) {
    let raw = "";
    try {
      raw =
        provider === "claude"
          ? await callClaude(system, user, aiSettings.anthropicModel)
          : await callOpenAI(system, user, aiSettings.openaiModel);
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

    const result = GeneratedReviewSchema.safeParse(
      normalizeGeneratedReviewJson(parsedJson),
    );
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
      passthroughImage ??
      (await resolveAmazonProductImageUrlWithRetry(amazonUrl));

    const faqs = review.faqs
      .map((f) => ({ q: f.q.trim(), a: f.a.trim() }))
      .filter((f) => f.q && f.a)
      .slice(0, 6);

    const specs: Record<string, string> = {};
    for (const [key, value] of Object.entries(review.specs)) {
      const k = key.trim();
      const v = String(value ?? "").trim();
      if (k && v && Object.keys(specs).length < 12) specs[k] = v;
    }

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
        faqs,
        specs,
        amazonUrl,
        imageUrl,
      },
    };
  }

  return {
    ok: false,
    message:
      providers.length > 1
        ? `AI generation failed (Claude and fallback). ${lastError}`
        : lastError,
  };
}

async function callClaude(system: string, user: string, model: string): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
    },
    body: JSON.stringify({
      model,
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

async function callOpenAI(system: string, user: string, model: string): Promise<string> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.chat.completions.create({
    model,
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
