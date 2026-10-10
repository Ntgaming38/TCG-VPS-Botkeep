import { describe, expect, it } from "vitest";
import { getMarketplace24hMovements, getMarketplacePriceChange, getMarketplacePriceTrend, marketplacePriceSourceLabel, parseMarketplaceHistoryPeriod } from "../shared/marketplacePriceHistory";

describe("marketplace price history helpers", () => {
  const points = [
    { id: 1, oldPrice: "1000", newPrice: "1200", source: "manual", createdAt: new Date("2026-08-01T00:00:00Z") },
    { id: 2, oldPrice: "1200", newPrice: "1500", source: "snkrdunk_auto", createdAt: new Date("2026-08-02T00:00:00Z") },
  ];

  it("tính xu hướng và chênh lệch từ chuỗi điểm giá theo thứ tự thời gian", () => {
    expect(getMarketplacePriceTrend(points)).toBe("up");
    expect(getMarketplacePriceChange(points)).toEqual({ amount: 300, percent: 25 });
  });

  it("không suy diễn xu hướng khi chỉ có một điểm giá", () => {
    expect(getMarketplacePriceTrend(points.slice(0, 1))).toBe("flat");
    expect(getMarketplacePriceChange(points.slice(0, 1))).toEqual({ amount: 0, percent: 0 });
  });

  it("hiển thị nguồn giá dễ hiểu", () => {
    expect(marketplacePriceSourceLabel("snkrdunk_auto")).toBe("SNKRDUNK");
    expect(marketplacePriceSourceLabel("manual")).toBe("Thủ công");
  });

  it("chỉ chấp nhận các mốc thời gian biểu đồ được hỗ trợ", () => {
    expect(parseMarketplaceHistoryPeriod(7)).toBe(7);
    expect(parseMarketplaceHistoryPeriod(30)).toBe(30);
    expect(parseMarketplaceHistoryPeriod(1)).toBe(30);
  });

  it("tính biến động 24 giờ từ giá cũ của mốc đầu và giá mới của mốc cuối", () => {
    const movements = getMarketplace24hMovements([
      { ...points[0], productId: 8 },
      { ...points[1], productId: 8 },
      { id: 3, productId: 9, oldPrice: null, newPrice: "500", source: "manual", createdAt: new Date() },
    ]);
    expect(movements).toEqual([
      { productId: 8, amount: 500, percent: 50, trend: "up", hasData: true },
      { productId: 9, amount: 0, percent: 0, trend: "flat", hasData: false },
    ]);
  });
});
