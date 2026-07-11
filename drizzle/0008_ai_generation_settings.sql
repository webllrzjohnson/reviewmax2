CREATE TABLE IF NOT EXISTS "ai_generation_settings" (
  "id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
  "anthropic_model" text,
  "openai_model" text,
  "review_system_prompt" text,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

INSERT INTO "ai_generation_settings" (
  "id",
  "anthropic_model",
  "openai_model",
  "review_system_prompt"
)
VALUES (
  'default',
  NULL,
  NULL,
  NULL
)
ON CONFLICT ("id") DO NOTHING;
