import { isChyusenDeadlineToday } from "./chyusenDate";

type DatedChyusen = { applicationEnd?: Date | string | null };

export function prioritizeChyusenDeadlineToday<T extends DatedChyusen>(entries: T[], now = new Date()) {
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((left, right) => {
      const priority = Number(isChyusenDeadlineToday(right.entry.applicationEnd, now)) - Number(isChyusenDeadlineToday(left.entry.applicationEnd, now));
      return priority || left.index - right.index;
    })
    .map(({ entry }) => entry);
}
