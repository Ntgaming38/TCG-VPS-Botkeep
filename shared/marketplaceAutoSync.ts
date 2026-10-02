export type MarketplacePriceDecision = {
  shouldUpdate: boolean;
  marketPrice: string;
};

/** Giá cũ luôn được giữ khi nguồn không trả về JPY dương, hữu hạn. */
export function resolveMarketplacePriceUpdate(previousPrice: string | number | null | undefined, candidatePrice: unknown): MarketplacePriceDecision {
  const previous = String(previousPrice ?? "0");
  const candidate = Number(candidatePrice);
  if (!Number.isFinite(candidate) || candidate <= 0) {
    return { shouldUpdate: false, marketPrice: previous };
  }
  return { shouldUpdate: true, marketPrice: String(candidate) };
}

export function marketplaceAutoSyncStatusLabel(status?: string | null): string {
  if (status === "success") return "Hoàn tất";
  if (status === "partial") return "Hoàn tất một phần";
  if (status === "failed") return "Không thể đồng bộ";
  return "Chưa chạy";
}
