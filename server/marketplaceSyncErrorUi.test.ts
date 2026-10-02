import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Marketplace sync error tracking UI", () => {
  it("hiển thị ETA, ô Lỗi đồng bộ và bảng ghi chú URL lỗi", () => {
    const page = readFileSync(join(process.cwd(), "client/src/pages/Marketplace.tsx"), "utf8");
    const history = readFileSync(join(process.cwd(), "client/src/components/SyncErrorHistory.tsx"), "utf8");

    expect(page).toContain("syncErrorHistory");
    expect(page).toContain("label=\"Lỗi đồng bộ\"");
    expect(page).toContain("Ước tính còn khoảng");
    expect(page).toContain("filter === \"error\"");
    expect(history).toContain("Ghi chú URL lỗi đồng bộ");
    expect(history).toContain("Đã xử lý");
  });
});
