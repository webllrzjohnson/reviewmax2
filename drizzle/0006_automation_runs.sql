DO $$ BEGIN
  CREATE TYPE "automation_run_status" AS ENUM ('running', 'success', 'failed', 'partial');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "automation_run_type" AS ENUM ('product_discovery');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "automation_run_item_status" AS ENUM ('generated', 'skipped', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "automation_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "type" "automation_run_type" NOT NULL,
  "status" "automation_run_status" DEFAULT 'running' NOT NULL,
  "category" text NOT NULL,
  "country" text NOT NULL,
  "max_items" integer DEFAULT 3 NOT NULL,
  "summary" text,
  "error" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "started_by" uuid,
  "started_at" timestamptz DEFAULT now() NOT NULL,
  "finished_at" timestamptz
);

CREATE TABLE IF NOT EXISTS "automation_run_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "run_id" uuid NOT NULL,
  "product_name" text NOT NULL,
  "amazon_url" text,
  "status" "automation_run_item_status" NOT NULL,
  "post_slug" text,
  "message" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_started_by_users_id_fk"
    FOREIGN KEY ("started_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "automation_run_items" ADD CONSTRAINT "automation_run_items_run_id_automation_runs_id_fk"
    FOREIGN KEY ("run_id") REFERENCES "public"."automation_runs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "automation_runs_started_at_idx" ON "automation_runs" ("started_at" DESC);
CREATE INDEX IF NOT EXISTS "automation_run_items_run_id_idx" ON "automation_run_items" ("run_id");
