import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const inventoryPage = readFileSync(new URL("../client/src/pages/Inventory.tsx", import.meta.url), "utf8");
const databaseSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");

describe("bộ lọc Tất cả trong Kho Hàng", () => {
  it("gửi trạng thái all rõ ràng từ giao diện để bao gồm cả sản phẩm đã bán", () => {
    expect(inventoryPage).toContain('status: statusFilter === "all" ? "all" : statusFilter');
  });

  it("không áp dụng điều kiện loại trừ đã bán khi trạng thái là all", () => {
    expect(databaseSource).toContain('if (opts?.status === "all")');
    expect(databaseSource).toContain('conditions.push(ne(products.status, "sold"));');
  });
});
