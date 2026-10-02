import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

describe("Rank Card badge", () => {
  it("dùng màu nền riêng cho Rank A, B, C và D", () => {
    const source = readFileSync(join(root, "client/src/components/RankBadge.tsx"), "utf8");
    expect(source).toContain('A: "border-yellow-400');
    expect(source).toContain('B: "border-red-500');
    expect(source).toContain('C: "border-cyan-400');
    expect(source).toContain('D: "border-slate-500 bg-gradient-to-r from-black');
  });

  it("giữ chữ Rank Card RGB và tôn trọng chế độ giảm chuyển động", () => {
    const source = readFileSync(join(root, "client/src/components/RankBadge.tsx"), "utf8");
    const styles = readFileSync(join(root, "client/src/index.css"), "utf8");
    expect(source).toContain('className="rank-rgb-text"');
    expect(styles).toContain(':root[data-rgb-effects="enabled"] .rank-rgb-text');
    expect(styles).toContain('prefers-reduced-motion: reduce');
  });

  it("hiển thị tooltip giá thị trường khi hover hoặc focus badge", () => {
    const source = readFileSync(join(root, "client/src/components/RankBadge.tsx"), "utf8");
    expect(source).toContain("TooltipTrigger");
    expect(source).toContain("tabIndex={0}");
    expect(source).toContain("Giá thị trường theo Rank");
    expect(source).toContain("formatYen(price)");
  });
});
