import type { TrashQuickPeriod } from "./trashQuickPeriod";

export const TRASH_FILTER_STORAGE_KEY = "tcg-manager:trash-filter-preferences";

const VALID_TYPES = ["all", "product", "purchase", "sale", "chyusen", "source", "notification"] as const;
const VALID_PERIODS = ["all", "week", "month"] as const;

export type TrashFilterType = typeof VALID_TYPES[number];

export interface TrashFilterPreferences {
  filter: TrashFilterType;
  search: string;
  deletedDate: string;
  quickPeriod: TrashQuickPeriod;
}

export const DEFAULT_TRASH_FILTER_PREFERENCES: TrashFilterPreferences = {
  filter: "all",
  search: "",
  deletedDate: "",
  quickPeriod: "all",
};

export function parseTrashFilterPreferences(value: string | null): TrashFilterPreferences {
  if (!value) return DEFAULT_TRASH_FILTER_PREFERENCES;

  try {
    const parsed = JSON.parse(value) as Partial<TrashFilterPreferences>;
    return {
      filter: VALID_TYPES.includes(parsed.filter as TrashFilterType) ? parsed.filter as TrashFilterType : "all",
      search: typeof parsed.search === "string" ? parsed.search : "",
      deletedDate: typeof parsed.deletedDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.deletedDate) ? parsed.deletedDate : "",
      quickPeriod: VALID_PERIODS.includes(parsed.quickPeriod as TrashQuickPeriod) ? parsed.quickPeriod as TrashQuickPeriod : "all",
    };
  } catch {
    return DEFAULT_TRASH_FILTER_PREFERENCES;
  }
}

export function readTrashFilterPreferences() {
  if (typeof window === "undefined") return DEFAULT_TRASH_FILTER_PREFERENCES;
  return parseTrashFilterPreferences(window.localStorage.getItem(TRASH_FILTER_STORAGE_KEY));
}

export function saveTrashFilterPreferences(preferences: TrashFilterPreferences) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TRASH_FILTER_STORAGE_KEY, JSON.stringify(preferences));
}
