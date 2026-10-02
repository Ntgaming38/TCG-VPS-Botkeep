import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const homeSource = readFileSync(resolve(root, "client/src/pages/SnkrShop.tsx"), "utf8");
const detailSource = readFileSync(resolve(root, "client/src/pages/SnkrShopDetail.tsx"), "utf8");
const appSource = readFileSync(resolve(root, "client/src/App.tsx"), "utf8");

describe("Shop SNKR grid and detail navigation", () => {
  it("opens a dedicated detail route from compact product grid cards", () => {
    expect(homeSource).toContain("ShopGridCard");
    expect(homeSource).toContain("setLocation(`/shop-snkr/${item.id}`)");
    expect(appSource).toContain('path={"/shop-snkr/:id"}');
  });

  it("uses independent detail data, direct product image and price history", () => {
    expect(detailSource).toContain("trpc.snkrShop.get.useQuery");
    expect(detailSource).toContain("trpc.snkrShop.priceHistory.useQuery");
    expect(detailSource).toContain("trpc.snkrShop.quantityPrices.useQuery");
    expect(detailSource).toContain("referrerPolicy=\"no-referrer\"");
    expect(detailSource).toContain("ProductImageAdjuster");
    expect(detailSource).toContain("initialZoom={item.imageZoom}");
    expect(detailSource).toContain("không được đưa vào Kho Hàng hoặc báo cáo tài chính");
  });

  it("renders a compact quantity-price grid and compact history for box, pack and card tracking", () => {
    expect(detailSource).toContain("Giá theo số lượng");
    expect(detailSource).toContain("tối đa 10");
    expect(detailSource).toContain("Rank {item.cardRank}");
    expect(detailSource).toContain("h-[170px]");
  });

  it("removes pin controls and presents seven-day trends for every product", () => {
    expect(homeSource).not.toContain("Ghim ưu tiên");
    expect(homeSource).not.toContain("Đã ghim (");
    expect(homeSource).not.toContain("reorderPinned.mutate");
    expect(homeSource).toContain("trpc.snkrShop.trendHistory7d.useQuery");
  });

  it("uses white image frames in the grid and detail views", () => {
    expect(homeSource).toContain("ProductImageAdjuster");
    expect(detailSource).toContain("ProductImageAdjuster");
    const imageComponent = readFileSync(resolve(root, "client/src/components/ProductImageAdjuster.tsx"), "utf8");
    const displayLib = readFileSync(resolve(root, "client/src/lib/productImageDisplay.ts"), "utf8");
    expect(imageComponent).toContain("productImageFrameStyle");
    expect(imageComponent).toContain("bg-white");
    expect(displayLib).toContain("backgroundColor: \"#FFFFFF\"");
  });

  it("renders a compact seven-day sparkline from actual history for all products", () => {
    expect(homeSource).toContain("Xu hướng 7 ngày");
    expect(homeSource).toContain("Biểu đồ giá bảy ngày");
  });

  it("shows an RGB type label and a custom product name over the grid image", () => {
    expect(homeSource).toContain("const customImageLabel");
    expect(homeSource).toContain("rgb-action-label");
    expect(homeSource).toContain("ProductImageAdjuster");
    expect(homeSource).toContain("initialZoom={item.imageZoom}");
  });

  it("orders grid controls as sync, edit, then a red delete action with confirmation", () => {
    expect(homeSource).toContain("onDelete={() => setDeleteConfirmItem(item)}");
    expect(homeSource).toContain("Xóa sản phẩm theo dõi?");
    expect(homeSource).toContain("border-red-500/55 bg-red-950/35");
    const syncControl = homeSource.indexOf("aria-label={`Đồng bộ ${displayName}`}");
    const editControl = homeSource.indexOf("aria-label={`Sửa ${displayName}`}");
    const deleteControl = homeSource.indexOf("aria-label={`Xóa ${displayName}`}");
    expect(syncControl).toBeGreaterThan(-1);
    expect(editControl).toBeGreaterThan(syncControl);
    expect(deleteControl).toBeGreaterThan(editControl);
  });
});
