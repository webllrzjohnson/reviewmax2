ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "price_at_review" text;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "specs" jsonb NOT NULL DEFAULT '{}'::jsonb;
