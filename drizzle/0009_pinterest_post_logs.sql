CREATE TABLE IF NOT EXISTS "pinterest_post_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "post_id" uuid NOT NULL,
  "status" text NOT NULL,
  "board_id" text,
  "pin_id" text,
  "pin_url" text,
  "message" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "pinterest_post_logs" ADD CONSTRAINT "pinterest_post_logs_post_id_posts_id_fk"
    FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "pinterest_post_logs_post_id_idx" ON "pinterest_post_logs" ("post_id");
CREATE INDEX IF NOT EXISTS "pinterest_post_logs_created_at_idx" ON "pinterest_post_logs" ("created_at" DESC);
CREATE UNIQUE INDEX IF NOT EXISTS "pinterest_post_logs_pin_id_unique" ON "pinterest_post_logs" ("pin_id") WHERE "pin_id" IS NOT NULL;
