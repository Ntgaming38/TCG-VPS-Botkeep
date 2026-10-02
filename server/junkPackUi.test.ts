import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PRODUCT_TYPES, productTypeLabel } from "../shared/productCreateType";

const purchasesSource = readFileSync(join(process.cwd(), "client/src/pages/Purchases.tsx"), "utf8");
const productsSource = readFileSync(join(process.cwd(), "client/src/pages/Products.tsx"), "utf8");
const routerSource = readFileSync(join(process.cwd(), "server/routers.ts"), "utf8");
const databaseSource = readFileSync(join(process.cwd(), "server/db.ts"), "utf8");

describe("Pack Rác", () => {
  it("is a distinct inventory type with a Vietnamese label", () => {
    expect(PRODUCT_TYPES).toContain("junk_pack");
    expect(productTypeLabel("junk_pack")).toBe("Pack Rác");
    expect(productTypeLabel("pack")).toBe("Pack");
  });

  it("can be selected when recording a purchase and is visible as its own catalog type", () => {
    expect(purchasesSource).toContain('<SelectItem value="junk_pack">Pack Rác</SelectItem>');
    expect(productsSource).toContain('<SelectItem value="junk_pack">Pack Rác</SelectItem>');
  });

  it("validates the type and merges only a matching-name, matching-price purchase lot", () => {
    expect(routerSource).toContain('z.enum(["card", "box", "pack", "junk_pack"])');
    expect(databaseSource).toContain('Merge only when name, type and whole-JPY unit buy price are all identical.');
    expect(databaseSource).toContain('findMatchingPurchaseInventoryLot(matchingNameAndTypeProducts, data.productType, unitPrice)');
  });
});
