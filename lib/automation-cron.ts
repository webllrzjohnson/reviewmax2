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

export type AutomationCategoryGroup = {
  name: string;
  categories: string[];
};

const CATEGORY_GROUP_HEADER = /^\[([^\]]+)]$/;

export function parseAutomationCategoryGroups(
  categories: string[],
): AutomationCategoryGroup[] {
  const groups: AutomationCategoryGroup[] = [];
  let current: AutomationCategoryGroup | null = null;

  for (const rawValue of categories) {
    const value = rawValue.trim();
    if (!value) continue;

    const header = value.match(CATEGORY_GROUP_HEADER)?.[1]?.trim();
    if (header) {
      current = groups.find(
        (group) => group.name.toLowerCase() === header.toLowerCase(),
      ) ?? null;
      if (!current) {
        current = { name: header, categories: [] };
        groups.push(current);
      }
      continue;
    }

    if (!current) {
      current = { name: "General", categories: [] };
      groups.push(current);
    }
    if (!current.categories.some((category) => category.toLowerCase() === value.toLowerCase())) {
      current.categories.push(value);
    }
  }

  return groups.filter((group) => group.categories.length > 0);
}

export function hasAutomationDiscoveryCategories(categories: string[]): boolean {
  return parseAutomationCategoryGroups(categories).length > 0;
}

export function pickCronDiscoveryCategory(categories: string[], date = new Date()): string | null {
  const groups = parseAutomationCategoryGroups(categories);
  if (groups.length === 0) return null;

  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const today = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const dayIndex = Math.floor((today - start) / 86_400_000) - 1;
  const group = groups[dayIndex % groups.length];
  if (!group) return null;

  const groupCycle = Math.floor(dayIndex / groups.length);
  return group.categories[groupCycle % group.categories.length] ?? null;
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
