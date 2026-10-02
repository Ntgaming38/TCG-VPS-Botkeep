import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

describe("RGB rarity badges", () => {
  it("áp dụng lớp RGB cho mọi nhãn rarity", () => {
    const source = readFileSync(join(root, "client/src/components/RarityBadge.tsx"), "utf8");
    expect(source).toContain('className="rarity-rgb-text"');
    expect(source).toContain("{label}");
  });

  it("dùng bảng màu RGB đã chọn và tôn trọng giảm chuyển động", () => {
    const styles = readFileSync(join(root, "client/src/index.css"), "utf8");
    expect(styles).toContain(':root[data-rgb-effects="enabled"] .rarity-rgb-text');
    expect(styles).toContain("var(--tcg-rgb-gradient");
    expect(styles).toContain("prefers-reduced-motion: reduce");
  });

  it("có badge Promo cyan và Khác nền trắng, đều tái sử dụng chữ RGB", () => {
    const source = readFileSync(join(root, "client/src/components/RarityBadge.tsx"), "utf8");
    expect(source).toContain('Promo: "border-cyan-300');
    expect(source).toContain('Khác: "border-slate-300 bg-gradient-to-r from-white');
    expect(source).toContain('className="rarity-rgb-text"');
  });
});
