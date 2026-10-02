export function getDashboardProfitTone(totalProfit: number) {
  if (totalProfit > 0) return "text-green-400";
  if (totalProfit < 0) return "text-red-400";
  return "tcg-logo-text";
}
