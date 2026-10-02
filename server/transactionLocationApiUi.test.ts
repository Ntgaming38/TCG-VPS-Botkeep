import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("API địa điểm giao dịch", () => {
  it("cung cấp sửa/xóa cửa hàng mua và dữ liệu ba địa điểm gần đây", () => {
    const router = readFileSync(join(process.cwd(), "server/routers.ts"), "utf8");
    const database = readFileSync(join(process.cwd(), "server/db.ts"), "utf8");

    expect(router).toContain("listRecentPurchaseShops");
    expect(router).toContain("db.updateShop");
    expect(router).toContain("db.deleteShop");
    expect(router).toContain("db.setShopPinned");
    expect(router).toContain("listRecentSaleLocations");
    expect(router).toContain("db.setSaleLocationPinned");
    expect(database).toContain("export async function listRecentPurchaseShops");
    expect(database).toContain("export async function listRecentSaleLocations");
    expect(database).toContain("export async function setShopPinned");
    expect(database).toContain("export async function setSaleLocationPinned");
  });
});
