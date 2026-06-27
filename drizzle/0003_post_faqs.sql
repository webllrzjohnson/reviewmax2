ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "faqs" jsonb NOT NULL DEFAULT '[]'::jsonb;
