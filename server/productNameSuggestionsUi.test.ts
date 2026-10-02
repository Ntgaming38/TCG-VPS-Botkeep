import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const suggestionSource = readFileSync(join(process.cwd(), "client/src/components/ProductNameSuggestions.tsx"), "utf8");
const productsSource = readFileSync(join(process.cwd(), "client/src/pages/Products.tsx"), "utf8");
const purchasesSource = readFileSync(join(process.cwd(), "client/src/pages/Purchases.tsx"), "utf8");
const chyusenSource = readFileSync(join(process.cwd(), "client/src/pages/Chyusen.tsx"), "utf8");
const snkrShopSource = readFileSync(join(process.cwd(), "client/src/pages/SnkrShop.tsx"), "utf8");

describe("product name suggestions", () => {
  it("queries private inventory after the first typed character and reveals price lots", () => {
    expect(suggestionSource).toContain("enabled: trimmedSearch.length >= 1");
    expect(suggestionSource).toContain("Gợi ý tên sản phẩm trong kho");
    expect(suggestionSource).toContain("{formatYen(Number(product.buyPrice || 0))}/SP");
    expect(suggestionSource).toContain("Đang tìm tên sản phẩm trong kho…");
    expect(suggestionSource).toContain("Chưa có tên trùng trong kho.");
  });

  it("is available in every product-entry workflow", () => {
    [productsSource, purchasesSource, chyusenSource, snkrShopSource].forEach((source) => {
      expect(source).toContain("ProductNameSuggestions");
    });
    expect(purchasesSource).toContain('autoComplete="off"');
    expect(purchasesSource).toContain('className="relative z-30"');
    expect(purchasesSource).toContain("Sẽ gộp vào số lượng hiện có");
    expect(purchasesSource).toContain('role="status"');
    expect(purchasesSource).toContain("setSelectedExistingProduct(product)");
    expect(purchasesSource).toContain("Không thể gộp");
    expect(purchasesSource).toContain('role="alert"');
    expect(purchasesSource).toContain("Giá nhập mới");
    expect(purchasesSource).toContain("selectedPriceMatches");
    expect(purchasesSource).toContain("Tổng số lượng dự kiến sau khi gộp");
    expect(purchasesSource).toContain("projectedMergedQuantity");
  });

  it("shows both a lot's total buy value and its per-item buy price", () => {
    expect(productsSource).toContain('Mua:');
    expect(productsSource).toContain('{product.quantity} × {formatYen(Number(product.buyPrice))}/{productTypeLabel(product.type)}');
    expect(productsSource).toContain("Giá mua/SP tự tính:");
    expect(productsSource).toContain("Tự gộp khi trùng tên, loại và giá mua/SP.");
  });
});
