import { describe, expect, it } from "vitest";
import { extractExternalProductIdFromUrl } from "./chyusenSource";

describe("extractExternalProductIdFromUrl", () => {
  it("đọc Product ID từ URL P-Bandai và query công khai khi có", () => {
    expect(extractExternalProductIdFromUrl("https://p-bandai.jp/item/item-1000255803/")).toBe("1000255803");
    expect(extractExternalProductIdFromUrl("https://shop.example.jp/lottery?product_id=op09-1234")).toBe("op09-1234");
  });

  it("không tạo Product ID khi URL không có định danh hợp lệ", () => {
    expect(extractExternalProductIdFromUrl("https://shop.example.jp/lottery")).toBeUndefined();
    expect(extractExternalProductIdFromUrl("not-a-url")).toBeUndefined();
  });
});
