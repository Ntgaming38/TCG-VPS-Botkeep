export type MarketplaceManualSyncOutcome<T> =
  | { item: T; status: "fulfilled" }
  | { item: T; status: "rejected"; error: unknown };

/**
 * Runs a manual marketplace sync with bounded concurrency. A failed or slow
 * product is isolated so the remaining products always continue processing.
 */
export async function processMarketplaceManualSyncBatch<T>(
  items: T[],
  syncOne: (item: T) => Promise<void>,
  concurrency = 3,
): Promise<MarketplaceManualSyncOutcome<T>[]> {
  if (items.length === 0) return [];

  const outcomes: MarketplaceManualSyncOutcome<T>[] = new Array(items.length);
  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      const item = items[index];
      try {
        await syncOne(item);
        outcomes[index] = { item, status: "fulfilled" };
      } catch (error) {
        outcomes[index] = { item, status: "rejected", error };
      }
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return outcomes;
}
