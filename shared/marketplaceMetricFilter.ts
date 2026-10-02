export const MARKETPLACE_FILTERS = ["all", "synced", "pending", "unlinked", "error"] as const;

export type MarketplaceFilter = typeof MARKETPLACE_FILTERS[number];
export type MarketplaceMetric = "total" | "synced" | "pending" | "unlinked" | "error";

export const marketplaceMetricFilter: Record<MarketplaceMetric, MarketplaceFilter> = {
  total: "all",
  synced: "synced",
  pending: "pending",
  unlinked: "unlinked",
  error: "error",
};

export const MARKETPLACE_FILTER_STORAGE_KEY = "tcg-marketplace-filter";
export const MARKETPLACE_SEARCH_STORAGE_KEY = "tcg-marketplace-search";

const MARKETPLACE_FILTER_LABELS: Record<MarketplaceFilter, string> = {
  all: "Tất cả sản phẩm",
  synced: "Đã đồng bộ",
  pending: "Chờ đồng bộ",
  unlinked: "Chưa gắn link",
  error: "Lỗi đồng bộ",
};

export function parseMarketplaceFilter(value: string | null | undefined): MarketplaceFilter {
  return MARKETPLACE_FILTERS.some((filter) => filter === value) ? value as MarketplaceFilter : "all";
}

export function marketplaceFilterLabel(filter: MarketplaceFilter) {
  return MARKETPLACE_FILTER_LABELS[filter];
}

export function parseMarketplaceSearch(value: string | null | undefined) {
  return typeof value === "string" ? value.trim().slice(0, 160) : "";
}

export function shouldClearMarketplaceFiltersOnKey(key: string, hasActiveFilters: boolean) {
  return key === "Escape" && hasActiveFilters;
}
