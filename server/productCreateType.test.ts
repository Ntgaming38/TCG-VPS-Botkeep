import { describe, expect, it } from "vitest";
import { getAutoCreateProductType } from "../shared/productCreateType";

describe("productCreateType", () => {
  it.each(["card", "box", "pack", "junk_pack"])("tự nhận diện loại %s theo trang sản phẩm", (type) => {
    expect(getAutoCreateProductType(type)).toBe(type);
  });

  it("không ép loại trên trang danh sách tổng", () => {
    expect(getAutoCreateProductType("all")).toBeNull();
  });
});
