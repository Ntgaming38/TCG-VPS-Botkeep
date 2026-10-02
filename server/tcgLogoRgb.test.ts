import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(fileURLToPath(new URL("../client/src/index.css", import.meta.url)), "utf8");

describe("TCG Manager RGB logo", () => {
  it("dùng gradient RGB chạy ngang cho logo TCG Manager", () => {
    expect(css).toContain(".tcg-logo-text");
    expect(css).toContain("linear-gradient(90deg");
    expect(css).toContain("animation: tcg-rgb-flow var(--tcg-rgb-duration, 5.8s) linear infinite;");
    expect(css).toContain("from { background-position: 200% 50%; }");
    expect(css).toContain("to { background-position: 0% 50%; }");
  });

  it("tắt chuyển động khi người dùng yêu cầu giảm chuyển động", () => {
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain(".tcg-logo-text { animation: none; background-position: 50% 50%; }");
  });

  it("áp dụng cùng hiệu ứng cho tiêu đề chính và có thể tắt theo cài đặt", () => {
    expect(css).toContain(":root[data-rgb-effects=\"enabled\"] main h1");
    expect(css).toContain(":root[data-rgb-effects=\"disabled\"] main h1");
    expect(css).toContain(":root[data-rgb-effects=\"disabled\"] .tcg-logo-text");
  });

  it("có các biến tốc độ chậm, bình thường và nhanh cho chuyển động RGB", () => {
    expect(css).toContain(':root[data-rgb-speed="slow"] { --tcg-rgb-duration: 10s; }');
    expect(css).toContain(':root[data-rgb-speed="normal"] { --tcg-rgb-duration: 5.8s; }');
    expect(css).toContain(':root[data-rgb-speed="fast"] { --tcg-rgb-duration: 3.2s; }');
    expect(css).toContain("animation: tcg-rgb-flow var(--tcg-rgb-duration, 5.8s) linear infinite;");
  });

  it("có bản xem trước RGB phản chiếu tốc độ và trạng thái tắt", () => {
    expect(css).toContain(".rgb-effects-preview");
    expect(css).toContain('.rgb-effects-preview[data-rgb-speed="slow"] { --rgb-preview-duration: 10s; }');
    expect(css).toContain('.rgb-effects-preview[data-rgb-speed="fast"] { --rgb-preview-duration: 3.2s; }');
    expect(css).toContain(".rgb-effects-preview.is-disabled .rgb-effects-preview-logo");
  });

  it("dùng biến bảng màu có thể tùy chỉnh cho logo, tiêu đề và bản xem trước", () => {
    expect(css).toContain("var(--tcg-rgb-gradient");
    expect(css).toContain(".tcg-logo-text");
    expect(css).toContain(":root[data-rgb-effects=\"enabled\"] main h1");
  });

  it("có chuyển cảnh đăng nhập phát sáng theo bảng màu RGB và hỗ trợ reduced motion", () => {
    expect(css).toContain(".login-rgb-transition-overlay");
    expect(css).toContain("@keyframes login-rgb-transition");
    expect(css).toContain("var(--tcg-rgb-gradient");
  });
});
