export const SALE_QUICK_PERIODS = ["today", "week", "month"] as const;
export type SaleQuickPeriod = (typeof SALE_QUICK_PERIODS)[number];

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getQuickSaleDateRange(period: SaleQuickPeriod, currentDate = new Date()) {
  const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  const fromDate = new Date(today);

  if (period === "week") {
    const daysSinceMonday = (today.getDay() + 6) % 7;
    fromDate.setDate(today.getDate() - daysSinceMonday);
  }

  if (period === "month") fromDate.setDate(1);

  return { fromDate: toDateInputValue(fromDate), toDate: toDateInputValue(today) };
}
