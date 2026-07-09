import { AUTOMATION_MAX_ITEMS_PER_RUN, normalizeAutomationMaxItems } from "@/lib/automation";

export type AutomationCronConfig = {
  categories: string[];
  country: string;
  maxItems: number;
};

type EnvLike = Record<string, string | undefined>;

export function parseAutomationCronConfig(env: EnvLike): AutomationCronConfig {
  return {
    categories: (env.AUTOMATION_DISCOVERY_CATEGORIES ?? "")
      .split(",")
      .map((category) => category.trim())
      .filter(Boolean),
    country: env.AUTOMATION_DISCOVERY_COUNTRY?.trim() || "United States",
    maxItems: normalizeAutomationMaxItems(
      env.AUTOMATION_MAX_DRAFTS_PER_RUN ?? 1,
    ),
  };
}

export function pickCronDiscoveryCategory(categories: string[], date = new Date()): string | null {
  if (categories.length === 0) return null;
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const today = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const dayOfYear = Math.floor((today - start) / 86_400_000);
  return categories[(dayOfYear - 1) % categories.length] ?? null;
}

export function getAuthorizedCronSecret(authorization: string | null): string | null {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export function isCronAuthorized(authorization: string | null, expectedSecret: string | undefined): boolean {
  const provided = getAuthorizedCronSecret(authorization);
  return Boolean(expectedSecret && provided && provided === expectedSecret);
}

export { AUTOMATION_MAX_ITEMS_PER_RUN };
