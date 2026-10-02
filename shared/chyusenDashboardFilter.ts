import { getChyusenDaysRemaining } from "./chyusenDate";
import { isChyusenExpiring, isChyusenResolved } from "./chyusenDashboardStats";

export const DASHBOARD_CHYUSEN_FILTERS = ["dashboard_waiting", "dashboard_expiring", "dashboard_won", "dashboard_lost"] as const;

export type DashboardChyusenFilter = typeof DASHBOARD_CHYUSEN_FILTERS[number];

type ChyusenFilterableEntry = {
  applicationEnd?: Date | string | null;
  applicationStatus: string;
  resultStatus?: string | null;
  timeState: string;
};

export function isDashboardChyusenFilter(value: string | null): value is DashboardChyusenFilter {
  return DASHBOARD_CHYUSEN_FILTERS.some((filter) => filter === value);
}

export function matchesDashboardChyusenFilter(entry: ChyusenFilterableEntry, filter: DashboardChyusenFilter) {
  const withDaysRemaining = { ...entry, daysRemaining: getChyusenDaysRemaining(entry.applicationEnd) };
  if (filter === "dashboard_waiting") return !isChyusenResolved(withDaysRemaining) && (entry.applicationStatus === "registered" || entry.timeState === "waiting_result");
  if (filter === "dashboard_expiring") return isChyusenExpiring(withDaysRemaining);
  if (filter === "dashboard_won") return entry.applicationStatus === "won" || entry.resultStatus === "won";
  return entry.applicationStatus === "lost" || entry.resultStatus === "lost";
}
