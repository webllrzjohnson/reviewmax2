ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "gallery_urls" text[] DEFAULT '{}'::text[] NOT NULL;
