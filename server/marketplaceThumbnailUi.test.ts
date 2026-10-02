import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const marketplaceSource = readFileSync(join(process.cwd(), "client/src/pages/Marketplace.tsx"), "utf8");

describe("Marketplace product thumbnails", () => {
  it("renders the shared product image component for desktop and mobile rows", () => {
    expect(marketplaceSource).toContain('import { ProductImageAdjuster } from "@/components/ProductImageAdjuster";');
    expect(marketplaceSource).toContain('<ProductImageAdjuster entity="product"');
    expect(marketplaceSource).toContain('src={product.image}');
    expect(marketplaceSource).toContain('initialZoom={product.imageZoom}');
  });

  it("maps Card to the portrait image kind and other inventory types to box-pack", () => {
    expect(marketplaceSource).toContain('kind={isCard ? "card" : "box-pack"}');
    expect(marketplaceSource).not.toContain('<Package className="h-4 w-4" />');
  });
});
