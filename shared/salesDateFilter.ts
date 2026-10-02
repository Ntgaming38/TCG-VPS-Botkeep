export type SaleDateFilterItem = {
  id: number;
  productId?: number | null;
  productName?: string | null;
  quantity?: number | string | null;
  totalRevenue?: number | string | null;
  fee?: number | string | null;
  shippingFee?: number | string | null;
  otherCost?: number | string | null;
  profit?: number | string | null;
  saleDate: Date | string | number;
};

export type SalesProductSummary = {
  key: string;
  productName: string;
  transactionCount: number;
  quantity: number;
  totalRevenue: number;
  totalCostBasis: number;
  totalProfit: number;
  averageUnitPrice: number;
  averageUnitCost: number;
};

function localDateKey(value: Date | string | number) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function filterSalesByDateRange<T extends SaleDateFilterItem>(sales: T[], fromDate?: string, toDate?: string) {
  return sales.filter((sale) => {
    const saleDate = localDateKey(sale.saleDate);
    if (!saleDate) return false;
    return (!fromDate || saleDate >= fromDate) && (!toDate || saleDate <= toDate);
  });
}

export function summarizeSales(sales: SaleDateFilterItem[]) {
  const products = new Map<string, Omit<SalesProductSummary, "averageUnitPrice" | "averageUnitCost">>();
  let totalRevenue = 0;
  let totalCostBasis = 0;
  let totalProfit = 0;
  let totalQuantity = 0;

  for (const sale of sales) {
    const quantity = Number(sale.quantity || 0);
    const revenue = Number(sale.totalRevenue || 0);
    const transactionCosts = Number(sale.fee || 0) + Number(sale.shippingFee || 0) + Number(sale.otherCost || 0);
    const profit = Number(sale.profit || 0);
    const costBasis = revenue - transactionCosts - profit;
    const key = sale.productId ? `product-${sale.productId}` : `name-${sale.productName || "Sản phẩm"}`;
    const current = products.get(key) || { key, productName: sale.productName || "Sản phẩm", transactionCount: 0, quantity: 0, totalRevenue: 0, totalCostBasis: 0, totalProfit: 0 };
    current.transactionCount += 1;
    current.quantity += quantity;
    current.totalRevenue += revenue;
    current.totalCostBasis += costBasis;
    current.totalProfit += profit;
    products.set(key, current);
    totalQuantity += quantity;
    totalRevenue += revenue;
    totalCostBasis += costBasis;
    totalProfit += profit;
  }

  const productSummaries = Array.from(products.values())
    .map((product) => ({
      ...product,
      averageUnitPrice: product.quantity > 0 ? Math.round(product.totalRevenue / product.quantity) : 0,
      averageUnitCost: product.quantity > 0 ? Math.round(product.totalCostBasis / product.quantity) : 0,
    }))
    .sort((left, right) => right.totalRevenue - left.totalRevenue || left.productName.localeCompare(right.productName, "vi"));

  return { transactionCount: sales.length, totalQuantity, totalRevenue, totalCostBasis, totalProfit, products: productSummaries };
}
