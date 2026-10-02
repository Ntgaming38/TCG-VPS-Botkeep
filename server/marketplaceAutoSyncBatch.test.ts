import { describe, expect, it, vi } from "vitest";
import { processMarketplaceAutoSyncBatch } from "./marketplaceAutoSyncBatch";

describe("Marketplace auto-sync batch", () => {
  it("tiếp tục các sản phẩm còn lại khi một nguồn lỗi và không báo cập nhật cho sản phẩm lỗi", async () => {
    const syncOne = vi.fn(async (product: { id: number }) => {
      if (product.id === 2) throw new Error("Không có giá JPY hợp lệ");
    });

    const summary = await processMarketplaceAutoSyncBatch([
      { id: 1, userId: 1 }, { id: 2, userId: 1 }, { id: 3, userId: 1 },
    ], syncOne);

    expect(syncOne).toHaveBeenCalledTimes(3);
    expect(summary).toEqual({ checkedCount: 3, updatedCount: 2, failedCount: 1 });
  });
});
