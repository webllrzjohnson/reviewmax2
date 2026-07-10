CREATE TABLE IF NOT EXISTS "automation_settings" (
  "id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "categories" text[] DEFAULT '{}'::text[] NOT NULL,
  "country" text DEFAULT 'United States' NOT NULL,
  "notification_email" text,
  "notify_on_run" boolean DEFAULT false NOT NULL,
  "monthly_summary_enabled" boolean DEFAULT false NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

INSERT INTO "automation_settings" (
  "id",
  "enabled",
  "categories",
  "country",
  "notification_email",
  "notify_on_run",
  "monthly_summary_enabled"
)
VALUES (
  'default',
  true,
  COALESCE(string_to_array(NULLIF(current_setting('app.automation_categories', true), ''), ','), '{}'::text[]),
  'United States',
  NULL,
  false,
  false
)
ON CONFLICT ("id") DO NOTHING;
