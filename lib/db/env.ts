const NEXT_PRODUCTION_BUILD_PHASE = "phase-production-build";
const BUILD_FALLBACK_DATABASE_URL =
  "postgresql://postgres:postgres@127.0.0.1:5432/postgres";

export function resolveDatabaseUrl(
  env: Partial<NodeJS.ProcessEnv> = process.env,
) {
  if (env.DATABASE_URL) return env.DATABASE_URL;

  if (env.NEXT_PHASE === NEXT_PRODUCTION_BUILD_PHASE) {
    return BUILD_FALLBACK_DATABASE_URL;
  }

  throw new Error("Missing DATABASE_URL");
}
