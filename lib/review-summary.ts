type ReviewSummaryInput = {
  title: string;
  category?: { name?: string | null; slug?: string | null } | null;
  pros?: string[] | null;
  cons?: string[] | null;
  body?: string | null;
  rating?: number | string | null;
};

const CATEGORY_FALLBACKS: Record<string, { bestFor: string; skipIf: string }> = {
  "smart-home": {
    bestFor:
      "Renters, parents, pet owners, and first-time smart-home buyers who want simple indoor monitoring.",
    skipIf:
      "You need outdoor weatherproofing, 5 GHz Wi-Fi, or advanced AI detection like faces and packages.",
  },
  "sun-protection-uv-clothing": {
    bestFor:
      "Outdoor users who want lightweight, easy sun coverage for fishing, paddling, hiking, or yard work.",
    skipIf:
      "You need insulated warmth, a dressy fit, or lab-certified performance details beyond UPF coverage.",
  },
  "home-maintenance": {
    bestFor:
      "DIYers who want practical, budget-aware help for common home maintenance jobs.",
    skipIf:
      "You need contractor-grade equipment, professional service, or a tool for daily jobsite abuse.",
  },
  "safety-security": {
    bestFor:
      "Homeowners and outdoor users who want practical safety gear before a problem becomes urgent.",
    skipIf:
      "You need certified workplace protection, professional installation, or regulated safety equipment.",
  },
};

const CAMERA_PATTERN = /\b(camera|monitoring|pan\/?tilt|security cam|baby monitor|pet)\b/i;
const SUN_PATTERN = /\b(upf|uv|sun|sleeve|hoodie|fishing|swimming)\b/i;
const BOOK_PATTERN = /\b(book|guide|manual|repair)\b/i;

function firstMeaningful(values: string[] | null | undefined) {
  return values?.find((value) => value.trim().length > 0)?.trim();
}

function normalizeRating(rating: number | string | null | undefined) {
  if (rating == null || rating === "") return "—";
  const value = Number(rating);
  if (Number.isNaN(value)) return "—";
  return value.toFixed(1).replace(/\.0$/, "");
}

export function buildReviewSummary(input: ReviewSummaryInput) {
  const titleAndBody = `${input.title}\n${input.body ?? ""}`;
  const categorySlug = input.category?.slug ?? "";
  const categoryName = input.category?.name ?? "this category";
  const fallback = CATEGORY_FALLBACKS[categorySlug];

  let bestFor = fallback?.bestFor;
  let skipIf = fallback?.skipIf;

  if (CAMERA_PATTERN.test(titleAndBody)) {
    bestFor =
      "Renters, parents, pet owners, and first-time buyers who want affordable indoor monitoring without mandatory cloud fees.";
    skipIf =
      "You need outdoor weatherproofing, 5 GHz Wi-Fi, HomeKit support, or advanced AI detection.";
  } else if (SUN_PATTERN.test(titleAndBody)) {
    bestFor =
      "Outdoor users who want quick UPF coverage for fishing, paddling, hiking, cycling, or long days in the sun.";
    skipIf =
      "You need premium tailoring, cold-weather warmth, or verified technical specs beyond everyday UPF protection.";
  } else if (BOOK_PATTERN.test(titleAndBody)) {
    bestFor =
      "Hands-on learners and DIYers who want a practical reference they can keep nearby while working.";
    skipIf =
      "You prefer short videos, app-guided diagnostics, or a beginner-only overview with very little detail.";
  }

  return {
    bestFor:
      bestFor ??
      `Shoppers comparing ${categoryName.toLowerCase()} who want the strongest fit, not just the cheapest option.`,
    skipIf:
      skipIf ??
      firstMeaningful(input.cons) ??
      "You need features, sizing, or support this product does not clearly offer.",
    standOut:
      firstMeaningful(input.pros) ??
      "A practical feature mix for buyers comparing similar options.",
    scoreSnapshot: `${normalizeRating(input.rating)}/5 Verdict score`,
  };
}
