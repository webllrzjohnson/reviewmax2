"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { aiGenerationSettings } from "@/lib/db/schema";
import {
  AI_GENERATION_SETTINGS_ID,
  DEFAULT_REVIEW_SYSTEM_PROMPT,
  mergeAiGenerationSettingsWithEnv,
  normalizeAiSettingsInput,
} from "@/lib/ai-settings";
import { generateReviewDraft } from "@/lib/generate-review";

export type AiSettingsState = {
  ok: boolean;
  message?: string;
};

export async function updateAiGenerationSettingsAction(
  _prev: AiSettingsState,
  formData: FormData,
): Promise<AiSettingsState> {
  await requireAdmin();

  const input = normalizeAiSettingsInput({
    anthropicModel: String(formData.get("anthropicModel") ?? ""),
    openaiModel: String(formData.get("openaiModel") ?? ""),
    reviewSystemPrompt: String(formData.get("reviewSystemPrompt") ?? ""),
  });

  await db
    .insert(aiGenerationSettings)
    .values({
      id: AI_GENERATION_SETTINGS_ID,
      anthropicModel: input.anthropicModel,
      openaiModel: input.openaiModel,
      reviewSystemPrompt: input.reviewSystemPrompt,
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: aiGenerationSettings.id,
      set: {
        anthropicModel: input.anthropicModel,
        openaiModel: input.openaiModel,
        reviewSystemPrompt: input.reviewSystemPrompt,
        updatedAt: new Date().toISOString(),
      },
    });

  revalidatePath("/dashboard/automation");
  return { ok: true, message: "AI generation settings saved." };
}

export async function resetAiGenerationSettingsAction(
  _prev?: AiSettingsState,
): Promise<AiSettingsState> {
  await requireAdmin();

  await db
    .insert(aiGenerationSettings)
    .values({
      id: AI_GENERATION_SETTINGS_ID,
      anthropicModel: null,
      openaiModel: null,
      reviewSystemPrompt: null,
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: aiGenerationSettings.id,
      set: {
        anthropicModel: null,
        openaiModel: null,
        reviewSystemPrompt: null,
        updatedAt: new Date().toISOString(),
      },
    });

  revalidatePath("/dashboard/automation");
  return { ok: true, message: "AI settings reset to defaults." };
}

export async function testAiGenerationSettingsAction(
  _prev: AiSettingsState,
  formData: FormData,
): Promise<AiSettingsState> {
  await requireAdmin();

  const input = normalizeAiSettingsInput({
    anthropicModel: String(formData.get("anthropicModel") ?? ""),
    openaiModel: String(formData.get("openaiModel") ?? ""),
    reviewSystemPrompt: String(formData.get("reviewSystemPrompt") ?? DEFAULT_REVIEW_SYSTEM_PROMPT),
  });
  const settings = mergeAiGenerationSettingsWithEnv(input, process.env);

  const result = await generateReviewDraft(
    {
      product_name: "COSRX Snail Mucin 96% Power Repairing Essence",
      category_slug: "vitamin-c-serum",
      amazon_url: "https://www.amazon.ca/dp/B00PBX3L7K",
      notes:
        "Test the admin prompt with a practical Canadian buyer perspective. Do not save this as a post.",
      skip_image_resolution: true,
    },
    settings,
  );

  if (!result.ok) return result;

  return {
    ok: true,
    message: `Preview generated with ${result.model}: ${result.draft.title}\n\n${result.draft.excerpt}\n\nVerdict: ${result.draft.verdict}`,
  };
}
