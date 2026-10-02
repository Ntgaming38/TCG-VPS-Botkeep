import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

describe("RGB action button labels", () => {
  it("áp dụng nhãn RGB cho các nút hành động chính", () => {
    for (const file of ["Products.tsx", "Purchases.tsx", "Sales.tsx", "Marketplace.tsx", "Chyusen.tsx", "Settings.tsx", "Trash.tsx"]) {
      const source = readFileSync(join(root, "client/src/pages", file), "utf8");
      expect(source).toContain("rgb-action-label");
    }
  });

  it("dùng bảng màu RGB tùy chỉnh và giảm chuyển động khi cần", () => {
    const styles = readFileSync(join(root, "client/src/index.css"), "utf8");
    expect(styles).toContain(':root[data-rgb-effects="enabled"] .rgb-action-label');
    expect(styles).toContain("var(--tcg-rgb-gradient");
    expect(styles).toContain("prefers-reduced-motion: reduce");
  });

  it("áp dụng RGB cho tên người dùng nhưng không ảnh hưởng email", () => {
    const sidebar = readFileSync(join(root, "client/src/components/DashboardLayout.tsx"), "utf8");
    expect(sidebar).toContain("rgb-user-name");
    expect(sidebar).toContain('text-xs text-muted-foreground truncate mt-1.5');
  });
});
