import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("địa điểm giao dịch tự thêm", () => {
  it("cho phép lưu và chọn lại cửa hàng mới trong Mua Hàng", () => {
    const source = readFileSync(join(process.cwd(), "client/src/pages/Purchases.tsx"), "utf8");
    expect(source).toContain("ADD_PURCHASE_SHOP_VALUE");
    expect(source).toContain("trpc.shops.list.useQuery()");
    expect(source).toContain("savePurchaseShop.mutate");
    expect(source).toContain("+ Thêm cửa hàng");
    expect(source).toContain("trpc.shops.recent.useQuery()");
    expect(source).toContain("updateSavedPurchaseShop.mutate");
    expect(source).toContain("deleteSavedPurchaseShop.mutate");
    expect(source).toContain("Cửa hàng tự thêm");
    expect(source).toContain("Dùng gần đây");
    expect(source).toContain("setSavedPurchaseShopPinned.mutate");
    expect(source).toContain("Ghim & tần suất cửa hàng");
    expect(source).toContain("useCount");
  });

  it("cho phép lưu và chọn lại nơi bán mới trong Bán Hàng", () => {
    const source = readFileSync(join(process.cwd(), "client/src/pages/Sales.tsx"), "utf8");
    expect(source).toContain("ADD_SALE_LOCATION_VALUE");
    expect(source).toContain("saveSaleLocation.mutate");
    expect(source).toContain("+ Thêm nơi bán");
    expect(source).toContain("trpc.saleLocations.recent.useQuery()");
    expect(source).toContain("updateSavedSaleLocation.mutate");
    expect(source).toContain("deleteSavedSaleLocation.mutate");
    expect(source).toContain("Nơi bán tự thêm");
    expect(source).toContain("Dùng gần đây");
    expect(source).toContain("setSavedSaleLocationPinned.mutate");
    expect(source).toContain("Ghim & tần suất nơi bán");
    expect(source).toContain("useCount");
  });
});
