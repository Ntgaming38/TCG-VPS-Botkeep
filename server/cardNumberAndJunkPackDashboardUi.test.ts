import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const productsSource = readFileSync(join(root, "client/src/pages/Products.tsx"), "utf8");
const inventorySource = readFileSync(join(root, "client/src/pages/Inventory.tsx"), "utf8");
const dashboardSource = readFileSync(join(root, "client/src/pages/Dashboard.tsx"), "utf8");
const rarityBadgeSource = readFileSync(join(root, "client/src/components/RarityBadge.tsx"), "utf8");
const stylesSource = readFileSync(join(root, "client/src/index.css"), "utf8");

describe("Card Number and Pack Rác dashboard display", () => {
  it("shows a supplied Card Number immediately after the Card name in product and inventory lists", () => {
    for (const source of [productsSource, inventorySource]) {
      expect(source).toContain('product.type === "card" && product.cardNumber');
      expect(source).toContain('title={`Card Number: ${product.cardNumber}`}');
      expect(source).toContain('>#{product.cardNumber}</span>');
      expect(source).toContain('className="rgb-card-number');
    }

    expect(productsSource).toContain('<Label>Card Number</Label><Input value={editingProduct.cardNumber}');
    expect(stylesSource).toContain(':root[data-rgb-effects="enabled"] .rgb-card-number');
  });

  it("keeps FUR first in the rarity hierarchy and gives it a dedicated badge", () => {
    expect(rarityBadgeSource).toContain('FUR: "border-pink-300');
    expect(rarityBadgeSource).toContain('className="rarity-rgb-text"');
  });

  it("provides a dedicated amber summary card for Pack Rác currently in stock", () => {
    expect(dashboardSource).toContain("Pack Rác hiện có");
    expect(dashboardSource).toContain("Tổng số lượng Pack Rác đang có trạng thái Trong kho.");
    expect(dashboardSource).toContain("{inStockJunkPacks}</p>");
    expect(dashboardSource).toContain("<PackageOpen className=");
    expect(dashboardSource).toContain("border-amber-400/30");
  });
});
