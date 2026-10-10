import { describe, expect, it } from "vitest";
import { getChyusenEntryIdToMarkAfterPurchase, parseChyusenPurchaseDraft } from "../shared/chyusenPurchaseDraft";

describe("chyusen purchase handoff", () => {
  it("chuẩn hóa draft trúng Chyusen nhưng không tự đánh dấu giao dịch mua", () => {
    const draft = parseChyusenPurchaseDraft(JSON.stringify({
      chyusenEntryId: 42, productName: "One Piece Box", productType: "box", series: "One Piece", shop: "Joshin", quantity: 2, price: 12000,
    }));

    expect(draft).toMatchObject({ chyusenEntryId: 42, purchase: { productName: "One Piece Box", productType: "box", quantity: 2, price: 12000 } });
    expect(getChyusenEntryIdToMarkAfterPurchase(null)).toBeNull();
    expect(getChyusenEntryIdToMarkAfterPurchase(draft?.chyusenEntryId ?? null)).toBe(42);
  });

  it("bỏ draft lỗi và dùng giá trị an toàn cho dữ liệu không hợp lệ", () => {
    expect(parseChyusenPurchaseDraft("not-json")).toBeNull();
    expect(parseChyusenPurchaseDraft(JSON.stringify({ productType: "unknown", quantity: -2, price: -50 }))?.purchase)
      .toMatchObject({ productType: "box", quantity: 1, price: 0 });
  });
});
