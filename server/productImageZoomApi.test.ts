import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

describe("API zoom riêng từng ảnh", () => {
  it("exposes protected mutations for inventory and Shop SNKR", () => {
    const routers = read("server/routers.ts");
    expect(routers).toContain("updateImageZoom: protectedProcedure");
    expect(routers).toContain("db.updateProductImageZoom(input.id, ctx.user.id, input.imageZoom,");
    expect(routers).toContain("snkrShopDb.updateSnkrShopItemImageZoom(input.id, ctx.user.id, input.imageZoom,");
  });

  it("scopes both updates and reads by the authenticated user", () => {
    const db = read("server/db.ts");
    const snkrDb = read("server/snkrShopDb.ts");
    expect(db).toContain("and(eq(products.id, id), eq(products.userId, userId))");
    expect(snkrDb).toContain("and(eq(snkrShopItems.id, itemId), eq(snkrShopItems.userId, userId))");
  });

  it("keeps the GIF-capable image element and full white frame in one component", () => {
    const component = read("client/src/components/ProductImageAdjuster.tsx");
    expect(component).toContain("src={imageUrl}");
    expect(component).toContain("productImageFrameStyle()");
    expect(component).toContain("object-contain");
  });
});
