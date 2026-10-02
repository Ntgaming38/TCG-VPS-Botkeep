import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("Xu hướng giá bảy ngày cho toàn bộ Shop SNKR", () => {
  const databaseSource = readFileSync(join(root, "server/snkrShopDb.ts"), "utf8");
  const routerSource = readFileSync(join(root, "server/routers.ts"), "utf8");

  it("lấy lịch sử bảy ngày cho mọi sản phẩm thuộc tài khoản, không lọc theo ghim", () => {
    const trendFunction = databaseSource.slice(
      databaseSource.indexOf("export async function getSnkrShop7dHistory"),
      databaseSource.indexOf("export async function createSnkrShopItem"),
    );
    expect(trendFunction).toContain("where(eq(snkrShopItems.userId, userId))");
    expect(trendFunction).not.toContain("eq(snkrShopItems.isPinned, 1)");
    expect(trendFunction).toContain("7 * 24 * 60 * 60 * 1000");
  });

  it("cung cấp endpoint xu hướng bảy ngày riêng cho giao diện", () => {
    expect(routerSource).toContain("trendHistory7d: protectedProcedure");
    expect(routerSource).toContain("snkrShopDb.getSnkrShop7dHistory(ctx.user.id)");
    expect(routerSource).not.toContain("togglePin: protectedProcedure");
    expect(routerSource).not.toContain("reorderPinned: protectedProcedure");
  });
});
