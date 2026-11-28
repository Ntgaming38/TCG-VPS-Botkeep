import { describe, expect, it } from "vitest";
import { getChyusenEntryIdToMarkAfterPurchase, parseChyusenPurchaseDraft, shouldMarkChyusenPurchaseAfterCreate } from "../shared/chyusenPurchaseDraft";

describe("chyusen purchase handoff", () => {
  it("chuẩn hóa draft trúng Chyusen nhưng không tự đánh dấu giao dịch mua", () => {
    const draft = parseChyusenPurchaseDraft(JSON.stringify({
      chyusenEntryId: 42, productName: "One Piece Box", productType: "box", series: "One Piece", shop: "Joshin", quantity: 2, price: 12000,
    }));

    expect(draft).toMatchObject({ chyusenEntryId: 42, purchase: { productName: "One Piece Box", productType: "box", quantity: 2, price: 12000 } });
    expect(getChyusenEntryIdToMarkAfterPurchase(null)).toBeNull();
    expect(getChyusenEntryIdToMarkAfterPurchase(draft?.chyusenEntryId ?? null)).toBe(42);
  });

  it("chỉ tự đánh dấu đã mua khi giao dịch vừa tạo khớp tên sản phẩm của draft", () => {
    expect(shouldMarkChyusenPurchaseAfterCreate(42, "Chó Xanh Mới", "Chó Xanh Mới")).toBe(42);
    expect(shouldMarkChyusenPurchaseAfterCreate(42, "Chó Xanh Mới", "  chó   xanh mới ")).toBe(42);
    // Người dùng đã đổi tên trong form = tạo giao dịch khác, không đánh dấu nhầm.
    expect(shouldMarkChyusenPurchaseAfterCreate(42, "Chó Xanh Mới", "Hồng Tỷ")).toBeNull();
    expect(shouldMarkChyusenPurchaseAfterCreate(null, "Chó Xanh Mới", "Chó Xanh Mới")).toBeNull();
    expect(shouldMarkChyusenPurchaseAfterCreate(42, "", "Chó Xanh Mới")).toBeNull();
  });

  it("bỏ draft lỗi và dùng giá trị an toàn cho dữ liệu không hợp lệ", () => {
    expect(parseChyusenPurchaseDraft("not-json")).toBeNull();
    expect(parseChyusenPurchaseDraft(JSON.stringify({ productType: "unknown", quantity: -2, price: -50 }))?.purchase)
      .toMatchObject({ productType: "box", quantity: 1, price: 0 });
  });
});
