import { describe, expect, it } from "vitest";
import { shouldDisplayProductInCatalog } from "../shared/productVisibility";

describe("product catalog visibility", () => {
  it("ẩn sản phẩm đã bán hết khỏi danh sách Card, Box và Pack", () => {
    expect(shouldDisplayProductInCatalog({ status: "sold", quantity: 0 })).toBe(false);
    expect(shouldDisplayProductInCatalog({ status: "in_stock", quantity: 0 })).toBe(false);
  });

  it("giữ sản phẩm có tồn kho hiển thị trong danh sách chính", () => {
    expect(shouldDisplayProductInCatalog({ status: "in_stock", quantity: 1 })).toBe(true);
    expect(shouldDisplayProductInCatalog({ status: "damaged", quantity: 2 })).toBe(true);
  });
});
