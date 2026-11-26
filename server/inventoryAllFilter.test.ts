import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const inventoryPage = readFileSync(new URL("../client/src/pages/Inventory.tsx", import.meta.url), "utf8");
const databaseSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");

describe("bộ lọc mặc định trong Kho Hàng", () => {
  it("không gửi trạng thái all ở view mặc định để sản phẩm đã bán hết không hiển thị", () => {
    expect(inventoryPage).toContain('status: statusFilter === "all" ? undefined : statusFilter');
  });

  it("server loại trừ sản phẩm đã bán khi không có trạng thái rõ ràng", () => {
    expect(databaseSource).toContain('if (opts?.status === "all")');
    expect(databaseSource).toContain('conditions.push(ne(products.status, "sold"));');
  });

  it("gợi ý tên khi thêm sản phẩm vẫn gồm cả sản phẩm đã bán hết (không lọc theo trạng thái)", () => {
    const start = databaseSource.indexOf("export async function getProductSuggestions");
    const end = databaseSource.indexOf("\nexport", start + 10);
    const body = databaseSource.slice(start, end);
    expect(body).not.toContain('"sold"');
    expect(body).not.toContain("eq(products.status");
  });
});
