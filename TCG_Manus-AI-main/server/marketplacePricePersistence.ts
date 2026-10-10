import { resolveMarketplacePriceUpdate } from "../shared/marketplaceAutoSync";

/** Chỉ gọi writer khi giá mới hợp lệ; nếu không, giữ nguyên giá đang lưu trong DB. */
export async function persistMarketplacePriceIfValid(
  previousPrice: string | number | null | undefined,
  candidatePrice: unknown,
  writePrice: (nextPrice: string) => Promise<void>,
): Promise<{ updated: boolean; marketPrice: string }> {
  const decision = resolveMarketplacePriceUpdate(previousPrice, candidatePrice);
  if (!decision.shouldUpdate) return { updated: false, marketPrice: decision.marketPrice };
  await writePrice(decision.marketPrice);
  return { updated: true, marketPrice: decision.marketPrice };
}
