/** Structured-data helpers derived from free-text product fields. */

const CURRENCY_SYMBOLS: Record<string, string> = {
  $: "USD",
  "£": "GBP",
  "€": "EUR",
  "¥": "JPY",
  "₹": "INR",
};

export type ParsedPrice = { price: string; priceCurrency: string };

/**
 * Parses a free-text price like "$129.99", "GBP 49", or "€19,99" into a
 * schema.org-friendly { price, priceCurrency }. Handles a comma decimal mark
 * and dot-grouped thousands, but not European dot-grouping ("1.299,00"); such
 * inputs return null rather than a wrong amount. Currency defaults to USD when
 * only a bare number exists.
 */
export function parsePrice(input: string | null | undefined): ParsedPrice | null {
  if (!input) return null;
  const text = input.trim();
  if (!text) return null;

  let priceCurrency: string | undefined;

  for (const [symbol, code] of Object.entries(CURRENCY_SYMBOLS)) {
    if (text.includes(symbol)) {
      priceCurrency = code;
      break;
    }
  }

  const isoMatch = text.match(/\b([A-Z]{3})\b/);
  if (!priceCurrency && isoMatch) {
    priceCurrency = isoMatch[1];
  }

  // Grab the first number, treating a comma as a thousands separator only when
  // a dot decimal is also present; otherwise treat comma as the decimal mark.
  const numberMatch = text.match(/\d[\d.,]*\d|\d/);
  if (!numberMatch) return null;

  let numeric = numberMatch[0];
  if (numeric.includes(".") && numeric.includes(",")) {
    numeric = numeric.replace(/,/g, "");
  } else if (numeric.includes(",") && !numeric.includes(".")) {
    numeric = numeric.replace(/,/g, ".");
  }

  const value = Number(numeric);
  if (!Number.isFinite(value)) return null;

  return { price: String(value), priceCurrency: priceCurrency ?? "USD" };
}

/**
 * Best-effort brand from a product title. Affiliate listings usually lead with
 * the brand, so the first token is a reasonable signal. Returns null when the
 * leading token is too short or numeric to be a real brand.
 */
export function deriveBrand(title: string | null | undefined): string | null {
  if (!title) return null;
  const first = title.trim().split(/\s+/)[0] ?? "";
  const cleaned = first.replace(/[^\p{L}\p{N}&'+-]/gu, "");
  // Reject leads that start with a digit (e.g. "10000mAh", "32GB", "4K"); these
  // are almost always specs, not brands. A missing brand beats a wrong one.
  if (cleaned.length < 2 || /^\d/.test(cleaned)) return null;
  return cleaned;
}
