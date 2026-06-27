import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

const MIGRATIONS_TABLE = "_reviewmax_migrations";

/** Load `.env.local` when present (local dev). Coolify uses injected env vars. */
function loadEnvLocalIfPresent() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

async function ensureMigrationsTable(sql: postgres.Sql) {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS "${MIGRATIONS_TABLE}" (
      id serial PRIMARY KEY,
      filename text NOT NULL UNIQUE,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}

/**
 * Existing DBs created before migration tracking should skip 0000_initial.sql.
 * The incremental migrations (0001+) are all idempotent (IF NOT EXISTS / guarded
 * constraint), so they can safely run against a squashed or partially-migrated
 * schema without being marked here.
 */
async function bootstrapLegacyDatabase(sql: postgres.Sql) {
  const [hasPosts] = await sql`
    SELECT 1 AS ok
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'posts'
    LIMIT 1
  `;
  if (!hasPosts) return;

  await sql`
    INSERT INTO ${sql(MIGRATIONS_TABLE)} (filename)
    VALUES ('0000_initial.sql')
    ON CONFLICT (filename) DO NOTHING
  `;
  console.log(
    "Existing database detected — marked 0000_initial.sql as already applied.",
  );
}

async function isMigrationApplied(
  sql: postgres.Sql,
  filename: string,
): Promise<boolean> {
  const rows = await sql`
    SELECT 1 AS ok
    FROM ${sql(MIGRATIONS_TABLE)}
    WHERE filename = ${filename}
    LIMIT 1
  `;
  return rows.length > 0;
}

async function recordMigration(sql: postgres.Sql, filename: string) {
  await sql`
    INSERT INTO ${sql(MIGRATIONS_TABLE)} (filename)
    VALUES (${filename})
  `;
}

async function main() {
  loadEnvLocalIfPresent();

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }

  const migrationDir = path.join(process.cwd(), "drizzle");
  const migrationFiles = fs
    .readdirSync(migrationDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  const sql = postgres(url, { max: 1 });

  try {
    await ensureMigrationsTable(sql);
    await bootstrapLegacyDatabase(sql);

    let appliedCount = 0;

    for (const file of migrationFiles) {
      if (await isMigrationApplied(sql, file)) {
        console.log(`Skipped ${file} (already applied)`);
        continue;
      }

      const content = fs.readFileSync(path.join(migrationDir, file), "utf8");
      const statements = content
        .split("--> statement-breakpoint")
        .map((statement) => statement.trim())
        .filter(Boolean);

      for (const statement of statements) {
        await sql.unsafe(statement);
      }

      await recordMigration(sql, file);
      console.log(`Applied ${file}`);
      appliedCount++;
    }

    if (appliedCount === 0) {
      console.log("No new migrations to run.");
    } else {
      console.log(`Migration complete (${appliedCount} file(s) applied).`);
    }
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
