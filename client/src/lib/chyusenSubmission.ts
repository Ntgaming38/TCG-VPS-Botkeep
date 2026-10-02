import { parseChyusenDayMonth } from "@shared/chyusenDate";
import { ADD_CUSTOM_CHYUSEN_SHOP_VALUE, isDefaultChyusenShop } from "@shared/chyusenShops";
import type { ChyusenDraft } from "./chyusenDraft";

const dateFields = [
  ["Bắt đầu đăng ký", "applicationStart"],
  ["Hết hạn đăng ký", "applicationEnd"],
  ["Công bố kết quả", "resultDate"],
  ["Ngày nhận hàng", "pickupStart"],
  ["Hạn mua hàng", "pickupEnd"],
] as const satisfies ReadonlyArray<readonly [string, keyof ChyusenDraft]>;

export function buildChyusenSubmission(draft: ChyusenDraft, savedAt = new Date()) {
  const parsedDates = Object.fromEntries(dateFields.map(([label, key]) => {
    const value = draft[key] as string;
    const parsed = value ? parseChyusenDayMonth(value, savedAt) : null;
    if (value && !parsed) throw new Error(`${label} phải có dạng Tháng/Ngày, ví dụ 09/03.`);
    return [key, parsed];
  }));
  const { sourceUrl, applicationStart, applicationEnd, resultDate, pickupStart, pickupEnd, ...otherFields } = draft;
  const selectedShop = draft.shop.trim();
  const customShopName = selectedShop === ADD_CUSTOM_CHYUSEN_SHOP_VALUE
    ? draft.customShopName.trim()
    : selectedShop && !isDefaultChyusenShop(selectedShop) ? selectedShop : "";

  return {
    ...otherFields,
    shop: customShopName ? "Khác" : selectedShop,
    sourceUrl: sourceUrl.trim() || undefined,
    imageUrl: draft.imageUrl || undefined,
    customShopName: customShopName || undefined,
    price: draft.price ? Number(draft.price) : null,
    applicationStart: parsedDates.applicationStart,
    applicationEnd: parsedDates.applicationEnd,
    resultDate: parsedDates.resultDate,
    pickupStart: parsedDates.pickupStart,
    pickupEnd: parsedDates.pickupEnd,
  };
}
