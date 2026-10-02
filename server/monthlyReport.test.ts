import { describe, expect, it } from "vitest";
import { createMonthlyReport } from "@shared/monthlyReport";

describe("monthly report", () => {
  it("chỉ tổng hợp mua và bán trong tháng được chọn", () => {
    const report = createMonthlyReport("2026-08", [{ purchaseDate: new Date(2026, 7, 3), totalPrice: "10000" }, { purchaseDate: new Date(2026, 6, 30), totalPrice: "5000" }], [{ saleDate: new Date(2026, 7, 9), totalRevenue: "15000", profit: "3500", fee: "500", quantity: 2, productName: "Pikachu", productType: "card" }, { saleDate: new Date(2026, 6, 20), totalRevenue: "9000", profit: "1000" }]);
    expect(report).toMatchObject({ totalBought: 10000, totalRevenue: 15000, totalProfit: 3500, totalFees: 500, saleCount: 1, soldUnits: 2 });
    expect(report.topProducts[0]).toMatchObject({ name: "Pikachu", profit: 3500 });
  });
});
