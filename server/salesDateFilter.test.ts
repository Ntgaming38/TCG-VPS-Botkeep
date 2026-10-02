import { describe, expect, it } from "vitest";
import { filterSalesByDateRange, summarizeSales } from "../shared/salesDateFilter";

const sales = [
  { id: 1, productId: 11, productName: "Pikachu SAR", quantity: 2, totalRevenue: 30000, profit: 8000, saleDate: "2026-08-10T03:00:00.000Z" },
  { id: 2, productId: 11, productName: "Pikachu SAR", quantity: 1, totalRevenue: 18000, profit: 6500, saleDate: "2026-08-12T03:00:00.000Z" },
  { id: 3, productId: 12, productName: "Luffy SR", quantity: 3, totalRevenue: 12000, profit: -900, saleDate: "2026-08-15T03:00:00.000Z" },
];

describe("salesDateFilter", () => {
  it("lọc bao gồm cả ngày bắt đầu và ngày kết thúc", () => {
    expect(filterSalesByDateRange(sales, "2026-08-10", "2026-08-12").map((sale) => sale.id)).toEqual([1, 2]);
  });

  it("tổng hợp số giao dịch, số lượng, doanh thu và từng sản phẩm", () => {
    const summary = summarizeSales(sales);
    expect(summary).toMatchObject({ transactionCount: 3, totalQuantity: 6, totalRevenue: 60000, totalCostBasis: 46400, totalProfit: 13600 });
    expect(summary.products[0]).toMatchObject({ productName: "Pikachu SAR", transactionCount: 2, quantity: 3, totalRevenue: 48000, totalCostBasis: 33500, averageUnitPrice: 16000, averageUnitCost: 11167 });
    expect(summary.products[1]).toMatchObject({ productName: "Luffy SR", transactionCount: 1, quantity: 3, totalRevenue: 12000, totalCostBasis: 12900, averageUnitPrice: 4000, averageUnitCost: 4300 });
  });
});
