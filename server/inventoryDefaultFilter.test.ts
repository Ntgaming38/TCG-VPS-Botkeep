import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("inventory default filter", () => {
  it("mở Kho hàng với bộ lọc Tất cả và chỉ thay đổi khi người dùng chọn", () => {
    const source = readFileSync(join(process.cwd(), "client/src/pages/Inventory.tsx"), "utf8");
    expect(source).toContain('useState("all")');
    expect(source).toContain("setStatusFilter");
    expect(source).toContain('statusFilter === "all" ? "all" : statusFilter');
  });
});
