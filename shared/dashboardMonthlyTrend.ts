export type DashboardMonthlyTrend = {
  percent: number | null;
  direction: "up" | "down" | "flat" | "new";
};

export function getDashboardMonthlyTrend(current: number, previous: number): DashboardMonthlyTrend {
  if (previous === 0 && current !== 0) return { percent: null, direction: "new" };
  if (previous === 0) return { percent: 0, direction: "flat" };
  const percent = Number((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
  return { percent, direction: percent > 0 ? "up" : percent < 0 ? "down" : "flat" };
}
