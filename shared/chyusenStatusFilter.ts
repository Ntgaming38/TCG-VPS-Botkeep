import { isDashboardChyusenFilter, matchesDashboardChyusenFilter } from "./chyusenDashboardFilter";

export const CHYUSEN_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "waiting_result", label: "Chờ kết quả" },
  { value: "dashboard_expiring", label: "Sắp hết hạn (0–1 ngày)" },
  { value: "dashboard_won", label: "Đã trúng (Dashboard)" },
  { value: "dashboard_lost", label: "Đã trượt (Dashboard)" },
  { value: "open", label: "Đang đăng ký" },
  { value: "expiring", label: "Sắp hết hạn" },
  { value: "expired", label: "Đã hết hạn" },
  { value: "registered", label: "Đã đăng ký" },
  { value: "won", label: "Đã trúng" },
  { value: "lost", label: "Đã trượt" },
] as const;

export type ChyusenStatusFilter = typeof CHYUSEN_STATUS_FILTER_OPTIONS[number]["value"];

export type ChyusenStatusFilterEntry = {
  applicationEnd?: Date | string | null;
  applicationStatus: string;
  resultStatus?: string | null;
  timeState: string;
};

export function matchesChyusenStatusFilter(entry: ChyusenStatusFilterEntry, filter: string) {
  if (filter === "all") return true;
  if (filter === "waiting_result") return matchesDashboardChyusenFilter(entry, "dashboard_waiting");
  if (isDashboardChyusenFilter(filter)) return matchesDashboardChyusenFilter(entry, filter);
  return entry.timeState === filter || entry.applicationStatus === filter;
}

export function countChyusenStatusFilters(entries: ChyusenStatusFilterEntry[]) {
  return Object.fromEntries(CHYUSEN_STATUS_FILTER_OPTIONS.map((option) => [
    option.value,
    entries.filter((entry) => matchesChyusenStatusFilter(entry, option.value)).length,
  ])) as Record<ChyusenStatusFilter, number>;
}
