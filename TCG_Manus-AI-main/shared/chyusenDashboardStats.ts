export type ChyusenDashboardEntry = {
  timeState: string;
  urgency?: string | null;
  daysRemaining?: number | null;
  applicationStatus: string;
  resultStatus?: string | null;
};

export function isChyusenResolved(entry: ChyusenDashboardEntry) {
  return entry.applicationStatus === "won" || entry.applicationStatus === "lost" || entry.resultStatus === "won" || entry.resultStatus === "lost";
}

export function isChyusenExpiring(entry: ChyusenDashboardEntry) {
  return !isChyusenResolved(entry) && entry.daysRemaining !== null && entry.daysRemaining !== undefined && entry.daysRemaining >= 0 && entry.daysRemaining <= 1;
}

export function getNearestExpiringChyusen<T extends ChyusenDashboardEntry>(entries: T[]) {
  return entries
    .filter(isChyusenExpiring)
    .sort((first, second) => (first.daysRemaining ?? Number.MAX_SAFE_INTEGER) - (second.daysRemaining ?? Number.MAX_SAFE_INTEGER))[0];
}

export function getNearestRegistrableChyusen<T extends ChyusenDashboardEntry & { sourceUrl?: string | null }>(entries: T[]) {
  return entries
    .filter((entry) => isChyusenExpiring(entry) && entry.applicationStatus === "not_registered" && Boolean(entry.sourceUrl))
    .sort((first, second) => (first.daysRemaining ?? Number.MAX_SAFE_INTEGER) - (second.daysRemaining ?? Number.MAX_SAFE_INTEGER))[0];
}

export function summarizeChyusenDashboard(entries: ChyusenDashboardEntry[]) {
  return {
    expiring: entries.filter(isChyusenExpiring).length,
    deadlineToday: entries.some((entry) => isChyusenExpiring(entry) && entry.daysRemaining === 0),
    deadlineTomorrow: entries.some((entry) => isChyusenExpiring(entry) && entry.daysRemaining === 1),
    waitingResult: entries.filter((entry) => !isChyusenResolved(entry) && (entry.applicationStatus === "registered" || entry.timeState === "waiting_result")).length,
    won: entries.filter((entry) => entry.applicationStatus === "won" || entry.resultStatus === "won").length,
    lost: entries.filter((entry) => entry.applicationStatus === "lost" || entry.resultStatus === "lost").length,
  };
}
