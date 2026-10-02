import { describe, expect, it, vi } from "vitest";
import { processMarketplaceManualSyncBatch } from "./marketplaceManualSyncBatch";

describe("Marketplace manual sync batch", () => {
  it("continues after a failed product while respecting the configured concurrency", async () => {
    let active = 0;
    let peak = 0;
    const syncOne = vi.fn(async (id: number) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      if (id === 2) throw new Error("Rank B không có giá JPY");
    });

    const outcomes = await processMarketplaceManualSyncBatch([1, 2, 3, 4], syncOne, 2);

    expect(syncOne).toHaveBeenCalledTimes(4);
    expect(peak).toBeLessThanOrEqual(2);
    expect(outcomes.map((outcome) => outcome.status)).toEqual(["fulfilled", "rejected", "fulfilled", "fulfilled"]);
  });
});
