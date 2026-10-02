import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const readClientFile = (name: string) => readFileSync(join(process.cwd(), "client/src", name), "utf8");

describe("ảnh fallback sản phẩm", () => {
  it("dùng chung component ảnh và URL fallback trong Kho Hàng, Shop SNKR và trang chi tiết", () => {
    const constantSource = readClientFile("const.ts");
    const componentSource = readClientFile("components/ProductImageAdjuster.tsx");
    expect(constantSource).toContain("FALLBACK_PRODUCT_IMAGE_URL");
    expect(constantSource).toContain("/manus-storage/tcg-product-fallback_93dfd725.png");
    expect(componentSource).toContain("FALLBACK_PRODUCT_IMAGE_URL");
    expect(componentSource).toContain("object-contain");
    expect(componentSource).toContain("onError");
    expect(componentSource).not.toContain("onPointerDown");
    expect(readClientFile("components/ProductImageEditControls.tsx")).toContain('type="range"');
    expect(readClientFile("pages/Products.tsx")).toContain("Loại sản phẩm");
    for (const fileName of ["pages/Products.tsx", "pages/SnkrShop.tsx", "pages/SnkrShopDetail.tsx"]) {
      const source = readClientFile(fileName);
      expect(source).toContain("ProductImageAdjuster");
    }
  });

  it("không hiển thị trạng thái icon rỗng thay cho fallback", () => {
    expect(readClientFile("pages/SnkrShop.tsx")).not.toContain("<ImageOff");
    expect(readClientFile("pages/SnkrShopDetail.tsx")).not.toContain("Chưa có ảnh sản phẩm");
  });
});
