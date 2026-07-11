import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { aiGenerationSettings } from "@/lib/db/schema";
import {
  AI_GENERATION_SETTINGS_ID,
  mergeAiGenerationSettingsWithEnv,
  type AiGenerationSettingsConfig,
} from "@/lib/ai-settings";

export async function getAiGenerationSettingsForDashboard(): Promise<AiGenerationSettingsConfig> {
  await requireAdmin();
  return getAiGenerationSettingsConfig();
}

export async function getAiGenerationSettingsConfig(): Promise<AiGenerationSettingsConfig> {
  const [settings] = await db
    .select()
    .from(aiGenerationSettings)
    .where(eq(aiGenerationSettings.id, AI_GENERATION_SETTINGS_ID))
    .limit(1);

  return mergeAiGenerationSettingsWithEnv(
    settings
      ? {
          anthropicModel: settings.anthropicModel,
          openaiModel: settings.openaiModel,
          reviewSystemPrompt: settings.reviewSystemPrompt,
        }
      : null,
    process.env,
  );
}
