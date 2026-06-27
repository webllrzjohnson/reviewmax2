ALTER TABLE "review_requests" ADD COLUMN IF NOT EXISTS "processed_at" timestamptz;
ALTER TABLE "review_requests" ADD COLUMN IF NOT EXISTS "processed_by" uuid;
ALTER TABLE "review_requests" ADD COLUMN IF NOT EXISTS "process_error" text;

DO $$ BEGIN
  ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_processed_by_users_id_fk"
    FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
