import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sortProductsByRecentPurchase } from "../shared/productRecentOrder";

describe("recent product ordering", () => {
  it("puts the lot with the latest purchase date first across product types", () => {
    const products = [
      { id: 1, type: "card", createdAt: "2026-09-01T00:00:00Z", latestPurchaseDate: "2026-09-10T00:00:00Z" },
      { id: 2, type: "box", createdAt: "2026-09-02T00:00:00Z", latestPurchaseDate: "2026-09-08T00:00:00Z" },
      { id: 3, type: "junk_pack", createdAt: "2026-09-03T00:00:00Z", latestPurchaseDate: "2026-09-09T00:00:00Z" },
      { id: 4, type: "pack", createdAt: "2026-09-04T00:00:00Z", latestPurchaseDate: "2026-09-07T00:00:00Z" },
    ];
    expect(sortProductsByRecentPurchase(products).map((product) => product.id)).toEqual([1, 3, 2, 4]);
  });

  it("ignores updatedAt: a price sync or edit must not reshuffle the purchase order", () => {
    const products = [
      // Bought most recently, but not touched since.
      { id: 1, createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z", latestPurchaseDate: "2026-09-10T00:00:00Z" },
      // Bought earlier, but price-synced (updatedAt bumped) yesterday.
      { id: 2, createdAt: "2026-09-02T00:00:00Z", updatedAt: "2026-09-20T00:00:00Z", latestPurchaseDate: "2026-09-05T00:00:00Z" },
    ];
    expect(sortProductsByRecentPurchase(products).map((product) => product.id)).toEqual([1, 2]);
  });

  it("falls back to creation date for lots without any purchase record", () => {
    const products = [
      { id: 1, type: "card", createdAt: "2026-09-01T00:00:00Z", latestPurchaseDate: null },
      { id: 2, type: "box", createdAt: "2026-09-03T00:00:00Z", latestPurchaseDate: null },
      { id: 3, type: "pack", createdAt: "2026-09-02T00:00:00Z" },
    ];
    expect(sortProductsByRecentPurchase(products).map((product) => product.id)).toEqual([2, 3, 1]);
  });

  it("uses the product id as a stable tie-breaker", () => {
    const products = [
      { id: 8, createdAt: "2026-09-04T00:00:00Z", latestPurchaseDate: "2026-09-04T00:00:00Z" },
      { id: 9, createdAt: "2026-09-04T00:00:00Z", latestPurchaseDate: "2026-09-04T00:00:00Z" },
    ];
    expect(sortProductsByRecentPurchase(products).map((product) => product.id)).toEqual([9, 8]);
  });

  it("wires the newest order into Products and Inventory defaults", () => {
    const productsSource = readFileSync(join(process.cwd(), "client/src/pages/Products.tsx"), "utf8");
    const inventorySource = readFileSync(join(process.cwd(), "client/src/pages/Inventory.tsx"), "utf8");
    expect(productsSource).toContain('useState<"newest" | "rarity" | "roi" | "marketPrice">("newest")');
    expect(productsSource).toContain('SelectItem value="newest">Mua gần nhất');
    expect(productsSource).toContain("sortProductsByRecentPurchase(products)");
    expect(inventorySource).toContain("sortProductsByRecentPurchase(products)");
  });
});
