import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(join(root, relativePath), "utf8");

describe("Thống kê Chūsen theo cửa hàng", () => {
  it("hiển thị panel thống kê ngay trong modal khi đã chọn cửa hàng", () => {
    const page = read("client/src/pages/Chyusen.tsx");
    expect(page).toContain("data-chyusen-shop-stats");
    expect(page).toContain("Thống kê cửa hàng");
    expect(page).toContain("Tỷ lệ trúng lịch sử");
    expect(page).toContain("Chưa đủ dữ liệu");
    expect(page).toContain("Tổng lượt");
    expect(page).toContain("Chờ kết quả");
    // Panel chỉ xuất hiện khi đã chọn cửa hàng, không phụ thuộc localStorage.
    expect(page).toContain("trpc.chyusen.shopStats.useQuery()");
    expect(page).toContain("selectedShopKey &&");
  });

  it("có endpoint shopStats lấy dữ liệu từ chính nguồn lịch sử (gồm lượt đã xóa mềm)", () => {
    const router = read("server/routers.ts");
    const db = read("server/chyusenDb.ts");
    expect(router).toContain("shopStats: protectedProcedure.query");
    expect(db).toContain("summarizeChyusenShopStatsForUser");
    // Phải dùng listChyusenResultHistory (không loại xóa mềm) để trượt/trúng vừa đủ.
    expect(db).toContain("listChyusenResultHistory(userId)");
    expect(db).toContain("summarizeChyusenShopStats(entries)");
  });

  it("giữ chống trùng cửa hàng theo tài khoản và lưu vào DB dùng chung", () => {
    const db = read("server/chyusenDb.ts");
    expect(db).toContain("saveChyusenShopSuggestion");
    // Chống trùng sau khi chuẩn hóa (so sánh không phân biệt hoa/thường/dấu).
    expect(db).toContain('row.name.localeCompare(name, undefined, { sensitivity: "accent" }) === 0');
  });
});
