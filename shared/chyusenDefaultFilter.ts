import { isDashboardChyusenFilter } from "./chyusenDashboardFilter";

export function resolveChyusenDefaultFilter(search: string) {
  const requestedFilter = new URLSearchParams(search).get("filter");
  return isDashboardChyusenFilter(requestedFilter) ? requestedFilter : "all";
}
