export type DashboardProductType = "card" | "box" | "pack" | "junk_pack";

export type DashboardMetricBreakdown = Record<DashboardProductType, number>;

export const emptyDashboardMetricBreakdown = (): DashboardMetricBreakdown => ({ card: 0, box: 0, pack: 0, junk_pack: 0 });

type StockMetricProduct = {
  id: number;
  type: string;
  quantity?: number | null;
  buyPrice?: number | string | null;
  marketPrice?: number | string | null;
};

type SaleMetric = { productId: number; profit?: number | string | null };

function isDashboardProductType(value: string): value is DashboardProductType {
  return value === "card" || value === "box" || value === "pack" || value === "junk_pack";
}

export function getStockMetricBreakdown(products: StockMetricProduct[], metric: "capital" | "market") {
  const breakdown = emptyDashboardMetricBreakdown();
  for (const product of products) {
    if (!isDashboardProductType(product.type)) continue;
    const unitValue = metric === "market"
      ? Number(product.marketPrice || product.buyPrice || 0)
      : Number(product.buyPrice || 0);
    breakdown[product.type] += unitValue * Number(product.quantity || 0);
  }
  return breakdown;
}

export function getSalesProfitBreakdown(sales: SaleMetric[], products: StockMetricProduct[]) {
  const breakdown = emptyDashboardMetricBreakdown();
  const productTypes = new Map(products.map((product) => [product.id, product.type]));
  for (const sale of sales) {
    const productType = productTypes.get(sale.productId);
    if (productType && isDashboardProductType(productType)) {
      breakdown[productType] += Number(sale.profit || 0);
    }
  }
  return breakdown;
}
