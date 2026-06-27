/** Extracts a Postgres error code (e.g. "23505" unique_violation) from an unknown thrown value. */
export function getDbErrorCode(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }
  return undefined;
}
