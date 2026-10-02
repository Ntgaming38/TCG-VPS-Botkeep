import { getChyusenDaysRemaining } from "./chyusenDate";

export type ChyusenResultReminderEntry = {
  resultDate?: Date | string | null;
  applicationStatus: string;
  resultStatus?: string | null;
  resultCheckedAt?: Date | string | null;
};

export function isChyusenResultAnnouncementToday(entry: ChyusenResultReminderEntry, now = new Date()) {
  if (entry.applicationStatus === "won" || entry.applicationStatus === "lost" || entry.resultStatus === "won" || entry.resultStatus === "lost") return false;
  return getChyusenDaysRemaining(entry.resultDate, now) === 0;
}

export function formatChyusenResultCountdown(value: Date | string | null | undefined, now = new Date()) {
  const days = getChyusenDaysRemaining(value, now);
  if (days === null) return null;
  if (days < 0) return "Đã đến ngày công bố";
  if (days === 0) return "Hôm nay công bố kết quả";
  return `Còn ${days} ngày đến công bố`;
}

export function isChyusenResultCheckOverdue(entry: ChyusenResultReminderEntry, now = new Date()) {
  if (entry.applicationStatus !== "registered" || entry.resultStatus === "won" || entry.resultStatus === "lost" || entry.resultCheckedAt) return false;
  const days = getChyusenDaysRemaining(entry.resultDate, now);
  return days !== null && days < 0;
}

export function formatChyusenResultCheckedAt(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date).reduce<Record<string, string>>((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute} JST`;
}
