export type PurchaseInventoryLotCandidate = {
  id: number;
  type: string;
  buyPrice?: number | string | null;
};

/**
 * Product records store buyPrice as a whole-JPY per-item amount. A purchase
 * can only be merged into a lot with the exact same product type and unit
 * price; callers additionally constrain the matching product name.
 */
export function findMatchingPurchaseInventoryLot<T extends PurchaseInventoryLotCandidate>(
  candidates: T[],
  type: string,
  unitPrice: number,
): T | undefined {
  return candidates.find((candidate) => candidate.type === type && Number(candidate.buyPrice ?? 0) === unitPrice);
}

/** Derives the whole-JPY price per item from a purchase lot total. */
export function getPurchaseUnitPrice(totalPrice: number, quantity: number): number {
  if (!Number.isFinite(totalPrice) || !Number.isFinite(quantity) || quantity <= 0) return 0;
  return Math.round(totalPrice / quantity);
}
