import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("Shop SNKR duplicate URL flow", () => {
  const dbSource = readFileSync(join(root, "server/snkrShopDb.ts"), "utf8");
  const uiSource = readFileSync(join(root, "client/src/pages/SnkrShop.tsx"), "utf8");

  it("trả về mục đã theo dõi thay vì ném lỗi khi thêm URL trùng", () => {
    expect(dbSource).toContain("return { ...trackedItem, alreadyTracked: true }");
    expect(dbSource).toContain("return { ...(created ?? item), alreadyTracked: false }");
  });

  it("đóng biểu mẫu và mở chi tiết mục đã theo dõi", () => {
    expect(uiSource).toContain("if (item.alreadyTracked)");
    expect(uiSource).toContain("setLocation(`/shop-snkr/${item.id}`)");
  });
});
