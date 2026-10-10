export const CHYUSEN_PURCHASE_DRAFT_STORAGE_KEY = "tcg-manager-chyusen-purchase-draft";

export type ChyusenPurchaseDraft = {
  chyusenEntryId: number | null;
  purchase: {
    productName: string;
    productType: "card" | "box" | "pack";
    series: string;
    shop: string;
    purchaseType: "mua_le";
    quantity: number;
    price: number;
    note: string;
  };
};

/** Chỉ chuẩn hóa dữ liệu điền sẵn; không đánh dấu Chyusen đã mua ở bước này. */
export function parseChyusenPurchaseDraft(rawDraft: string | null): ChyusenPurchaseDraft | null {
  if (!rawDraft) return null;
  try {
    const draft = JSON.parse(rawDraft) as Record<string, unknown>;
    const productType = ["card", "box", "pack"].includes(String(draft.productType))
      ? draft.productType as "card" | "box" | "pack"
      : "box";
    const entryId = Number(draft.chyusenEntryId);
    return {
      chyusenEntryId: Number.isInteger(entryId) && entryId > 0 ? entryId : null,
      purchase: {
        productName: String(draft.productName || ""),
        productType,
        series: String(draft.series || "Pokemon"),
        shop: String(draft.shop || "Khác"),
        purchaseType: "mua_le",
        quantity: Math.max(1, Number(draft.quantity || 1)),
        price: Math.max(0, Number(draft.price || 0)),
        note: String(draft.note || ""),
      },
    };
  } catch {
    return null;
  }
}

export function getChyusenEntryIdToMarkAfterPurchase(entryId: number | null): number | null {
  return entryId && entryId > 0 ? entryId : null;
}
