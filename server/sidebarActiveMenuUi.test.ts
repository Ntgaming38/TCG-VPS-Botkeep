import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const source = readFileSync(join(root, "client/src/components/DashboardLayout.tsx"), "utf8");

/**
 * Logic khớp active menu phải là:
 * - khớp chính xác path, HOẶC
 * - route con (path + "/")
 * để không nhầm hai menu có tiền tố giống nhau.
 */
function isMenuItemActive(location: string, path: string) {
  return location === path || location.startsWith(`${path}/`);
}

describe("Sidebar active menu", () => {
  it("chỉ active đúng một menu cho các route tiền tố giống nhau", () => {
    // Ở trang Lịch sử Chūsen: chỉ menu Lịch sử Chūsen active.
    expect(isMenuItemActive("/lich-su-chyusen", "/lich-su-chyusen")).toBe(true);
    expect(isMenuItemActive("/lich-su-chyusen", "/lich-su")).toBe(false);
    // Ở trang Lịch Sử hoạt động chung: chỉ menu Lịch Sử active.
    expect(isMenuItemActive("/lich-su", "/lich-su")).toBe(true);
    expect(isMenuItemActive("/lich-su", "/lich-su-chyusen")).toBe(false);
    // Trang Chūsen chính không kích hoạt hai menu lịch sử.
    expect(isMenuItemActive("/chyusen", "/lich-su")).toBe(false);
    expect(isMenuItemActive("/chyusen", "/lich-su-chyusen")).toBe(false);
  });

  it("vẫn cho phép route con kích hoạt menu cha (vd chi tiết Shop SNKR)", () => {
    expect(isMenuItemActive("/shop-snkr/123", "/shop-snkr")).toBe(true);
    expect(isMenuItemActive("/san-pham/card", "/san-pham/card")).toBe(true);
    expect(isMenuItemActive("/san-pham/card", "/san-pham/box")).toBe(false);
  });

  it("DashboardLayout dùng helper isMenuItemActive thay cho startsWith(item.path) trực tiếp", () => {
    expect(source).toContain("function isMenuItemActive(");
    expect(source).toContain("location === path || location.startsWith(`${path}/`)");
    // Hai điểm sử dụng: activeMenuItem (tiêu đề trang) và render menu.
    expect(source).toContain("menuItems.find(item => isMenuItemActive(location, item.path))");
    expect(source).toContain("const isActive = isMenuItemActive(location, item.path)");
    // Không còn so khớp tiền tố thiếu kiểm soát.
    expect(source).not.toMatch(/startsWith\(\s*item\.path\s*\)/);
  });
});
