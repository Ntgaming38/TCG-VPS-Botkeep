import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "server/snkrShopDb.ts"), "utf8");
const shopUi = readFileSync(join(process.cwd(), "client/src/pages/SnkrShop.tsx"), "utf8");

describe("Lưu ảnh cố định Shop SNKR", () => {
  it("lưu ảnh SNKRDUNK hợp lệ vào storage thay vì giữ URL CDN tạm thời", () => {
    expect(source).toContain("async function persistSnkrShopProductImage");
    expect(source).toContain("hostname !== \"snkrdunk.com\"");
    expect(source).toContain("storagePut(`snkr-shop/${userId}/product-${itemId}.${extension}`");
    expect(source).toContain("imageUrl: null");
  });

  it("tái dùng ảnh storage và thử lưu lại ảnh khi đồng bộ sản phẩm cũ", () => {
    expect(source).toContain("isStoredProductImage(metadata.imageUrl)");
    expect(source).toContain("const nextImageUrl = storedImage.imageUrl");
    expect(source).toContain("imageUrl: nextImageUrl");
    expect(source).toContain("sourceChanged ? { title: null, imageUrl: null }");
  });

  it("tải ảnh storage ngay khi mở lưới Shop SNKR và đặt lại fallback khi URL đổi", () => {
    expect(shopUi).toContain("ProductImageAdjuster");
    expect(readFileSync(join(process.cwd(), "client/src/components/ProductImageAdjuster.tsx"), "utf8")).toContain('loading={eager ? "eager" : "lazy"}');
    expect(readFileSync(join(process.cwd(), "client/src/components/ProductImageAdjuster.tsx"), "utf8")).toContain("setFailed(true)");
  });
});
