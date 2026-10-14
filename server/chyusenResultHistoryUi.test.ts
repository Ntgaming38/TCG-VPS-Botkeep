import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("Trang Lịch sử Chūsen", () => {
  it("có route và menu riêng ngay dưới Chūsen", () => {
    const app = readFileSync(join(root, "client/src/App.tsx"), "utf8");
    const layout = readFileSync(join(root, "client/src/components/DashboardLayout.tsx"), "utf8");
    expect(app).toContain('path="/lich-su-chyusen"');
    expect(app).toContain("ChyusenHistory");
    expect(layout).toContain('label: "Lịch sử Chūsen"');
    expect(layout).toContain('path: "/lich-su-chyusen"');
    // Menu Lịch sử phải nằm ngay sau menu Chūsen.
    const chyusenIndex = layout.indexOf('path: "/chyusen"');
    const historyIndex = layout.indexOf('path: "/lich-su-chyusen"');
    expect(chyusenIndex).toBeGreaterThan(-1);
    expect(historyIndex).toBeGreaterThan(chyusenIndex);
  });

  it("chỉ hiển thị lượt đã có kết quả, có bộ lọc, tìm kiếm và thống kê", () => {
    const page = readFileSync(join(root, "client/src/pages/ChyusenHistory.tsx"), "utf8");
    expect(page).toContain("trpc.chyusen.resultHistory.useQuery");
    expect(page).toContain("getChyusenResultOutcome");
    expect(page).toContain("summarizeChyusenResultHistory");
    // Lọc theo trạng thái.
    expect(page).toContain('value: "won"');
    expect(page).toContain('value: "lost"');
    expect(page).toContain('value: "cancelled"');
    // Tìm kiếm và sắp xếp mới nhất trước (theo thời điểm cập nhật, dự phòng createdAt).
    expect(page).toContain("placeholder=");
    expect(page).toContain("new Date(a.entry.updatedAt ?? a.entry.createdAt).getTime()");
    // Thống kê: tổng, trúng, trượt, hủy, tỷ lệ trúng.
    expect(page).toContain("Tổng lượt");
    expect(page).toContain("Đã trúng");
    expect(page).toContain("Trượt");
    expect(page).toContain("Hủy");
    expect(page).toContain("Tỷ lệ trúng");
  });

  it("thêm nút Hủy lượt trên trang Chūsen để đồng bộ trạng thái Hủy", () => {
    const page = readFileSync(join(root, "client/src/pages/Chyusen.tsx"), "utf8");
    expect(page).toContain('applicationStatus: "cancelled"');
    expect(page).toContain("Hủy lượt");
  });
});
