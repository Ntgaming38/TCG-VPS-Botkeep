import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const componentSource = readFileSync(join(process.cwd(), "client/src/components/ProductTypeBadge.tsx"), "utf8");
const productsSource = readFileSync(join(process.cwd(), "client/src/pages/Products.tsx"), "utf8");
const purchasesSource = readFileSync(join(process.cwd(), "client/src/pages/Purchases.tsx"), "utf8");
const inventorySource = readFileSync(join(process.cwd(), "client/src/pages/Inventory.tsx"), "utf8");
const reportsSource = readFileSync(join(process.cwd(), "client/src/pages/Reports.tsx"), "utf8");

describe("huy hiệu Pack Rác", () => {
  it("uses a distinct amber style and package icon", () => {
    expect(componentSource).toContain('junk_pack: "border-amber-300 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300');
    expect(componentSource).toContain('<PackageOpen className={iconClass}');
    expect(componentSource).toContain('Loại sản phẩm: ${label}');
  });

  it("is used in product, purchase, inventory and report listings", () => {
    for (const source of [productsSource, purchasesSource, inventorySource, reportsSource]) {
      expect(source).toContain('ProductTypeBadge');
    }
  });
});
