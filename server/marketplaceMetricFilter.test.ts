import { describe, expect, it } from "vitest";
import { marketplaceFilterLabel, marketplaceMetricFilter, parseMarketplaceFilter, parseMarketplaceSearch, shouldClearMarketplaceFiltersOnKey } from "../shared/marketplaceMetricFilter";

describe("marketplaceMetricFilter", () => {
  it("ánh xạ mỗi ô tổng quan đến đúng bộ lọc Marketplace", () => {
    expect(marketplaceMetricFilter).toEqual({
      total: "all",
      synced: "synced",
      pending: "pending",
      unlinked: "unlinked",
      error: "error",
    });
  });

  it("khôi phục bộ lọc hợp lệ và bỏ qua giá trị lưu không hợp lệ", () => {
    expect(parseMarketplaceFilter("synced")).toBe("synced");
    expect(parseMarketplaceFilter("unknown")).toBe("all");
    expect(parseMarketplaceFilter(null)).toBe("all");
  });

  it("hiển thị nhãn trạng thái và khôi phục từ khóa tìm kiếm an toàn", () => {
    expect(marketplaceFilterLabel("pending")).toBe("Chờ đồng bộ");
    expect(marketplaceFilterLabel("error")).toBe("Lỗi đồng bộ");
    expect(parseMarketplaceSearch("  Pikachu  ")).toBe("Pikachu");
    expect(parseMarketplaceSearch(null)).toBe("");
  });

  it("chỉ xóa bộ lọc bằng Esc khi đang có trạng thái lọc hoặc tìm kiếm", () => {
    expect(shouldClearMarketplaceFiltersOnKey("Escape", true)).toBe(true);
    expect(shouldClearMarketplaceFiltersOnKey("Escape", false)).toBe(false);
    expect(shouldClearMarketplaceFiltersOnKey("Enter", true)).toBe(false);
  });
});
