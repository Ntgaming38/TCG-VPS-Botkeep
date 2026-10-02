export type TrashQuickPeriod = "all" | "week" | "month";

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function matchesTrashQuickPeriod(value: Date | string, period: TrashQuickPeriod, now = new Date()) {
  if (period === "all") return true;

  const date = startOfDay(new Date(value));
  const today = startOfDay(now);

  if (period === "month") {
    return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
  }

  const mondayOffset = (today.getDay() + 6) % 7;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - mondayOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  return date >= weekStart && date < weekEnd;
}
