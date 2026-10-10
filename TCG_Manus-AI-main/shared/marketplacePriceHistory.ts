export type MarketplacePriceHistoryPoint = {
  id: number;
  oldPrice: string | number | null;
  newPrice: string | number;
  source: string | null;
  createdAt: Date | string;
};

export type MarketplacePriceTrend = "up" | "down" | "flat";
export const MARKETPLACE_HISTORY_PERIODS = [7, 30, 90] as const;
export type MarketplaceHistoryPeriod = typeof MARKETPLACE_HISTORY_PERIODS[number];

export type MarketplacePriceMovement24h = {
  productId: number;
  amount: number;
  percent: number;
  trend: MarketplacePriceTrend;
  hasData: boolean;
};

export function getMarketplacePriceTrend(history: MarketplacePriceHistoryPoint[]): MarketplacePriceTrend {
  if (history.length < 2) return "flat";
  const first = Number(history[0].newPrice) || 0;
  const latest = Number(history[history.length - 1].newPrice) || 0;
  if (latest > first) return "up";
  if (latest < first) return "down";
  return "flat";
}

export function getMarketplacePriceChange(history: MarketplacePriceHistoryPoint[]) {
  if (history.length < 2) return { amount: 0, percent: 0 };
  const first = Number(history[0].newPrice) || 0;
  const latest = Number(history[history.length - 1].newPrice) || 0;
  const amount = latest - first;
  return { amount, percent: first > 0 ? (amount / first) * 100 : 0 };
}

export function marketplacePriceSourceLabel(source: string | null) {
  if (source === "snkrdunk_auto") return "SNKRDUNK";
  if (source === "manual") return "Thủ công";
  return "Cập nhật giá";
}

export function parseMarketplaceHistoryPeriod(value: number | undefined): MarketplaceHistoryPeriod {
  return MARKETPLACE_HISTORY_PERIODS.includes(value as MarketplaceHistoryPeriod) ? value as MarketplaceHistoryPeriod : 30;
}

export function getMarketplace24hMovements(history: Array<MarketplacePriceHistoryPoint & { productId: number }>): MarketplacePriceMovement24h[] {
  const entriesByProduct = new Map<number, Array<MarketplacePriceHistoryPoint & { productId: number }>>();
  history.forEach((entry) => {
    const entries = entriesByProduct.get(entry.productId) ?? [];
    entries.push(entry);
    entriesByProduct.set(entry.productId, entries);
  });

  return Array.from(entriesByProduct.entries()).map(([productId, entries]) => {
    const first = entries[0];
    const latest = entries[entries.length - 1];
    const baseline = first.oldPrice === null ? Number.NaN : Number(first.oldPrice);
    const current = Number(latest.newPrice) || 0;
    if (!Number.isFinite(baseline)) return { productId, amount: 0, percent: 0, trend: "flat", hasData: false };
    const amount = current - baseline;
    return { productId, amount, percent: baseline > 0 ? (amount / baseline) * 100 : 0, trend: amount > 0 ? "up" : amount < 0 ? "down" : "flat", hasData: true };
  });
}
