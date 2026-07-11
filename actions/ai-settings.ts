"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { aiGenerationSettings } from "@/lib/db/schema";
import {
  AI_GENERATION_SETTINGS_ID,
  normalizeAiSettingsInput,
} from "@/lib/ai-settings";

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
