type MonthlyPurchase = { purchaseDate: Date | string; totalPrice?: number | string | null; quantity?: number | null };
type MonthlySale = { saleDate: Date | string; totalRevenue?: number | string | null; profit?: number | string | null; fee?: number | string | null; shippingFee?: number | string | null; otherCost?: number | string | null; quantity?: number | null; productName?: string | null; productType?: string | null };

function numeric(value: unknown) {
  const result = Number(value || 0);
  return Number.isFinite(result) ? result : 0;
}

function isWithinMonth(value: Date | string, month: string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  return key === month;
}

export function createMonthlyReport(month: string, purchases: MonthlyPurchase[], sales: MonthlySale[]) {
  const monthlyPurchases = purchases.filter((row) => isWithinMonth(row.purchaseDate, month));
  const monthlySales = sales.filter((row) => isWithinMonth(row.saleDate, month));
  const totalBought = monthlyPurchases.reduce((sum, row) => sum + numeric(row.totalPrice), 0);
  const totalRevenue = monthlySales.reduce((sum, row) => sum + numeric(row.totalRevenue), 0);
  const totalProfit = monthlySales.reduce((sum, row) => sum + numeric(row.profit), 0);
  const totalFees = monthlySales.reduce((sum, row) => sum + numeric(row.fee) + numeric(row.shippingFee) + numeric(row.otherCost), 0);
  const soldUnits = monthlySales.reduce((sum, row) => sum + numeric(row.quantity), 0);
  const productProfit = new Map<string, { name: string; type: string; profit: number; revenue: number; quantity: number }>();
  monthlySales.forEach((row) => {
    const name = row.productName || "Sản phẩm đã xóa";
    const current = productProfit.get(name) || { name, type: row.productType || "other", profit: 0, revenue: 0, quantity: 0 };
    current.profit += numeric(row.profit);
    current.revenue += numeric(row.totalRevenue);
    current.quantity += numeric(row.quantity);
    productProfit.set(name, current);
  });
  return {
    month,
    totalBought,
    totalRevenue,
    totalProfit,
    totalFees,
    purchaseCount: monthlyPurchases.length,
    saleCount: monthlySales.length,
    soldUnits,
    roi: totalBought > 0 ? (totalProfit / totalBought) * 100 : 0,
    topProducts: Array.from(productProfit.values()).sort((a, b) => b.profit - a.profit).slice(0, 5),
  };
}
