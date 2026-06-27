import OpenAI from "openai";
import { z } from "zod";
import { getCategoryBySlug } from "@/lib/data";
import {
  expandAmazonProductUrl,
  resolveAmazonProductImageUrl,
} from "@/lib/amazon-image";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Shape the model is asked to return; validated before we trust any field. */
export const GeneratedReviewSchema = z.object({
  title: z.string().min(1).max(500),
  slug: z.string().min(1).max(200),
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
  categoryId: string;
  rating: number;
  pros: string[];
  cons: string[];
  verdict: string;
  amazonUrl: string;
  imageUrl: string | null;
};

export type GenerateReviewResult =
  | { ok: true; draft: GeneratedReviewDraft }
  | { ok: false; message: string };

const MODEL = "gpt-4o-mini";

export async function generateReviewDraft(params: {
  product_name: string;
  category_slug: string;
  amazon_url: string;
  notes: string | null;
}): Promise<GenerateReviewResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      message:
        "OPENAI_API_KEY is not configured. Add it to your environment variables to generate reviews.",
    };
  }

  const category = await getCategoryBySlug(params.category_slug);
  if (!category) {
    return {
      ok: false,
      message: `Unknown category "${params.category_slug}". Create it first.`,
    };
  }

  const amazonUrl = await expandAmazonProductUrl(params.amazon_url);

  const slugBase = params.product_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  const system = `You write honest Amazon affiliate product reviews for Verdict.
Return ONLY valid JSON (no markdown fences) matching this schema:
{
  "title": "string",
  "slug": "lowercase-kebab-case",
  "excerpt": "1-2 sentences",
  "body": "markdown article, 400-800 words",
  "rating": 0-5 number with one decimal,
  "pros": ["string", ...],
  "cons": ["string", ...],
  "verdict": "2-4 sentence summary"
}
Use a slug starting with: ${slugBase}-review
Do not invent fake test results; write a plausible editorial tone.
Product images are fetched from Amazon when the review is published - do not include an image URL.`;

  const user = `Product: ${params.product_name}
Category slug: ${params.category_slug}
Amazon URL: ${amazonUrl}
${params.notes ? `Editor notes: ${params.notes}` : ""}`;

  let raw: string;
  try {
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      max_tokens: 4096,
      temperature: 0.6,
    });
    raw = response.choices[0]?.message?.content ?? "";
  } catch (error) {
    console.error("generateReviewDraft: OpenAI request failed", error);
    return { ok: false, message: "AI request failed. Try again." };
  }

  const parsedJson = parseJsonLoose(raw);
  if (parsedJson === undefined) {
    return { ok: false, message: "AI did not return valid JSON. Try again." };
  }

  const result = GeneratedReviewSchema.safeParse(parsedJson);
  if (!result.success) {
    console.error(
      "generateReviewDraft: output validation failed",
      result.error.flatten(),
    );
    return {
      ok: false,
      message:
        "AI response did not match the expected review format. Try again.",
    };
  }

  const review = result.data;

  const slug = review.slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "");

  if (!slug || !slugRegex.test(slug)) {
    return { ok: false, message: "AI produced an invalid slug. Try again." };
  }

  const imageUrl = await resolveAmazonProductImageUrl(amazonUrl);

  return {
    ok: true,
    draft: {
      title: review.title.slice(0, 500),
      slug,
      excerpt: review.excerpt.slice(0, 2000),
      body: review.body,
      categoryId: category.id,
      rating: review.rating,
      pros: review.pros,
      cons: review.cons,
      verdict: review.verdict.slice(0, 2000),
      amazonUrl,
      imageUrl,
    },
  };
}

/** Parse JSON, falling back to the first {...} block if the model added prose. */
function parseJsonLoose(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return undefined;
    try {
      return JSON.parse(match[0]);
    } catch {
      return undefined;
    }
  }
}
