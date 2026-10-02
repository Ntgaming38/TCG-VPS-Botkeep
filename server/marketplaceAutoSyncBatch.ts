export type MarketplaceAutoSyncCandidate = { id: number; userId: number };

export async function processMarketplaceAutoSyncBatch(
  products: MarketplaceAutoSyncCandidate[],
  syncOne: (product: MarketplaceAutoSyncCandidate) => Promise<void>,
  delayMs = 0,
): Promise<{ checkedCount: number; updatedCount: number; failedCount: number }> {
  let updatedCount = 0;
  let failedCount = 0;
  for (const product of products) {
    try {
      await syncOne(product);
      updatedCount += 1;
    } catch {
      failedCount += 1;
    }
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return { checkedCount: products.length, updatedCount, failedCount };
}
