import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

describe("Dashboard profit RGB display", () => {
  it("tách ký hiệu trạng thái với số tiền RGB", () => {
    const source = readFileSync(join(root, "client/src/pages/Dashboard.tsx"), "utf8");
    expect(source).toContain('totalProfit > 0 ? "+ " : totalProfit < 0 ? "- " : ""');
    expect(source).toContain("text-green-400");
    expect(source).toContain("text-red-400");
    expect(source).toContain("rgb-profit-amount");
    expect(source).toContain("profit-negative-amount");
  });

  it("giữ màu đỏ và animation cho số lợi nhuận âm", () => {
    const styles = readFileSync(join(root, "client/src/index.css"), "utf8");
    expect(styles).toContain(".profit-negative-amount");
    expect(styles).toContain("color: #f87171");
    expect(styles).toContain("animation: dashboard-sold-pulse");
  });

  it("dùng RGB cho các số liệu chính và animation đỏ cho số đã bán", () => {
    const source = readFileSync(join(root, "client/src/pages/Dashboard.tsx"), "utf8");
    const styles = readFileSync(join(root, "client/src/index.css"), "utf8");
    expect(source).toContain("rgb-dashboard-value");
    expect(source).toContain("dashboard-sold-value");
    expect(styles).toContain("dashboard-sold-pulse");
  });
});
