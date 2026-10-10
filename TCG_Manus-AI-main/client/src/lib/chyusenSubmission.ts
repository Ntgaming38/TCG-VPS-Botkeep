import { parseChyusenDayMonth } from "@shared/chyusenDate";
import type { ChyusenDraft } from "./chyusenDraft";

const dateFields = [
  ["Bắt đầu đăng ký", "applicationStart"],
  ["Hết hạn đăng ký", "applicationEnd"],
  ["Công bố kết quả", "resultDate"],
  ["Ngày nhận hàng", "pickupStart"],
] as const satisfies ReadonlyArray<readonly [string, keyof ChyusenDraft]>;

export function buildChyusenSubmission(draft: ChyusenDraft, savedAt = new Date()) {
  const parsedDates = Object.fromEntries(dateFields.map(([label, key]) => {
    const value = draft[key] as string;
    const parsed = value ? parseChyusenDayMonth(value, savedAt) : null;
    if (value && !parsed) throw new Error(`${label} phải có dạng ngày/tháng, ví dụ 05/01.`);
    return [key, parsed];
  }));
  const { sourceUrl, applicationStart, applicationEnd, resultDate, pickupStart, pickupEnd, ...otherFields } = draft;

  return {
    ...otherFields,
    sourceUrl: sourceUrl.trim() || undefined,
    imageUrl: draft.imageUrl || undefined,
    customShopName: draft.customShopName || undefined,
    price: draft.price ? Number(draft.price) : null,
    applicationStart: parsedDates.applicationStart,
    applicationEnd: parsedDates.applicationEnd,
    resultDate: parsedDates.resultDate,
    pickupStart: parsedDates.pickupStart,
    pickupEnd: null,
  };
}
