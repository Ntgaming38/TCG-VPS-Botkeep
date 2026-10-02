const japanDateParts = (date: Date) => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
}).formatToParts(date).reduce<Record<string, string>>((parts, part) => ({ ...parts, [part.type]: part.value }), {});

export function formatChyusenDayMonth(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = japanDateParts(date);
  return `${parts.month}/${parts.day}`;
}

export function formatChyusenDayMonthInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

export function isChyusenRegistrationExpired(value: Date | string | null | undefined, now = new Date()) {
  if (!value) return false;
  const deadline = new Date(value);
  if (Number.isNaN(deadline.getTime())) return false;
  const deadlineParts = japanDateParts(deadline);
  const nowParts = japanDateParts(now);
  return `${nowParts.year}${nowParts.month}${nowParts.day}` > `${deadlineParts.year}${deadlineParts.month}${deadlineParts.day}`;
}

export function getChyusenDaysRemaining(value: Date | string | null | undefined, now = new Date()) {
  if (!value) return null;
  const deadline = new Date(value);
  if (Number.isNaN(deadline.getTime())) return null;
  const deadlineParts = japanDateParts(deadline);
  const nowParts = japanDateParts(now);
  const deadlineDay = Date.UTC(Number(deadlineParts.year), Number(deadlineParts.month) - 1, Number(deadlineParts.day));
  const nowDay = Date.UTC(Number(nowParts.year), Number(nowParts.month) - 1, Number(nowParts.day));
  return Math.round((deadlineDay - nowDay) / 86_400_000);
}

export function formatChyusenDaysRemaining(value: Date | string | null | undefined, now = new Date()) {
  const days = getChyusenDaysRemaining(value, now);
  if (days === null) return null;
  if (days < 0) return `Đã quá hạn ${Math.abs(days)} ngày`;
  if (days === 0) return "Hôm nay là hạn cuối";
  return `Còn ${days} ngày`;
}

export type ChyusenDeadlineTone = "normal" | "warning" | "urgent" | "expired";

export function getChyusenDeadlineTone(value: Date | string | null | undefined, now = new Date()): ChyusenDeadlineTone {
  const days = getChyusenDaysRemaining(value, now);
  if (days === null || days > 3) return "normal";
  if (days < 0) return "expired";
  if (days <= 1) return "urgent";
  return "warning";
}

export function isChyusenDeadlineToday(value: Date | string | null | undefined, now = new Date()) {
  return getChyusenDaysRemaining(value, now) === 0;
}

export function isChyusenResultReady(value: Date | string | null | undefined, now = new Date()) {
  const days = getChyusenDaysRemaining(value, now);
  return days === null || days <= 0;
}

export function parseChyusenDayMonth(value: string, savedAt = new Date()) {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(japanDateParts(savedAt).year);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;

  return new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00+09:00`);
}
