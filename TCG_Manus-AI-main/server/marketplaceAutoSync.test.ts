import { describe, expect, it } from "vitest";
import { marketplaceAutoSyncStatusLabel, resolveMarketplacePriceUpdate } from "../shared/marketplaceAutoSync";

describe("Marketplace automatic sync safeguards", () => {
  it("giữ nguyên giá cũ khi nguồn không trả về giá JPY hợp lệ", () => {
    expect(resolveMarketplacePriceUpdate("4300", undefined)).toEqual({ shouldUpdate: false, marketPrice: "4300" });
    expect(resolveMarketplacePriceUpdate("4300", 0)).toEqual({ shouldUpdate: false, marketPrice: "4300" });
    expect(resolveMarketplacePriceUpdate("4300", Number.NaN)).toEqual({ shouldUpdate: false, marketPrice: "4300" });
  });

  it("chỉ cho phép cập nhật khi giá nguồn hợp lệ và hiển thị status lần chạy", () => {
    expect(resolveMarketplacePriceUpdate("4300", 5200)).toEqual({ shouldUpdate: true, marketPrice: "5200" });
    expect(marketplaceAutoSyncStatusLabel("partial")).toBe("Hoàn tất một phần");
    expect(marketplaceAutoSyncStatusLabel("failed")).toBe("Không thể đồng bộ");
  });
});
