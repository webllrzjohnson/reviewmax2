export type BasicActionResult =
  | {
      ok: boolean;
      message?: string;
    }
  | null
  | undefined;

export function normalizeActionResult(
  result: BasicActionResult,
  fallbackError: string,
) {
  if (!result) {
    return { ok: false, message: fallbackError };
  }

  if (result.ok) {
    return { ok: true, message: result.message };
  }

  return { ok: false, message: result.message ?? fallbackError };
}
