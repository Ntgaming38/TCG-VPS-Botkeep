import { getChyusenDaysRemaining } from "./chyusenDate";

type DatedChyusen = { applicationEnd?: Date | string | null };
type ResultDatedChyusen = { resultDate?: Date | string | null };

export function prioritizeChyusenDeadlineToday<T extends DatedChyusen>(entries: T[], now = new Date()) {
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((left, right) => {
      const leftDays = getChyusenDaysRemaining(left.entry.applicationEnd, now);
      const rightDays = getChyusenDaysRemaining(right.entry.applicationEnd, now);
      const leftPriority = leftDays === null || leftDays < 0 ? Number.MAX_SAFE_INTEGER : leftDays;
      const rightPriority = rightDays === null || rightDays < 0 ? Number.MAX_SAFE_INTEGER : rightDays;
      return leftPriority - rightPriority || left.index - right.index;
    })
    .map(({ entry }) => entry);
}

export function sortChyusenByNearestResultDate<T extends ResultDatedChyusen>(entries: T[], now = new Date()) {
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((left, right) => {
      const leftDays = getChyusenDaysRemaining(left.entry.resultDate, now);
      const rightDays = getChyusenDaysRemaining(right.entry.resultDate, now);
      const toPriority = (days: number | null) => {
        if (days === null) return Number.MAX_SAFE_INTEGER;
        return days < 0 ? Number.MAX_SAFE_INTEGER / 2 + Math.abs(days) : days;
      };
      return toPriority(leftDays) - toPriority(rightDays) || left.index - right.index;
    })
    .map(({ entry }) => entry);
}
