-- Add admin-assignable editorial badge to posts
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "badge" text;

-- Micro-feedback table for "Was this review helpful?" votes
CREATE TABLE IF NOT EXISTS "review_feedback" (
  "id"          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "post_slug"   text        NOT NULL,
  "helpful"     boolean     NOT NULL,
  "fingerprint" text        NOT NULL,
  "created_at"  timestamptz NOT NULL DEFAULT now()
);

-- One vote per (post, browser fingerprint)
CREATE UNIQUE INDEX IF NOT EXISTS "review_feedback_slug_fp_idx"
  ON "review_feedback" ("post_slug", "fingerprint");
