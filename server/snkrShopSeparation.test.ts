import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("Shop SNKR độc lập", () => {
  it("dùng hai bảng theo dõi riêng, không dùng products hoặc price_history của kho", () => {
    const schema = read("drizzle/schema.ts");
    const shopDb = read("server/snkrShopDb.ts");
    expect(schema).toContain('mysqlTable("snkr_shop_items"');
    expect(schema).toContain('mysqlTable("snkr_shop_price_history"');
    expect(shopDb).toContain("snkrShopItems");
    expect(shopDb).toContain("snkrShopPriceHistory");
    expect(shopDb).not.toMatch(/\bproducts\b/);
    expect(shopDb).not.toMatch(/\bpriceHistory\b/);
  });

  it("có router riêng và trang riêng, nêu rõ không cộng vào các chỉ số kinh doanh", () => {
    const router = read("server/routers.ts");
    const page = read("client/src/pages/SnkrShop.tsx");
    const app = read("client/src/App.tsx");
    const layout = read("client/src/components/DashboardLayout.tsx");
    expect(router).toContain("snkrShop: router({");
    expect(router).toContain("syncSnkrShopItem");
    expect(app).toContain('path={"/shop-snkr"}');
    expect(layout).toContain('label: "Shop SNKR"');
    expect(page).toContain("không cộng vào Kho Hàng, vốn, doanh thu hoặc lợi nhuận");
  });
});
