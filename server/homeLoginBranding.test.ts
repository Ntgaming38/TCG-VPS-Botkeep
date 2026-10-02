import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const home = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");

describe("Login branding", () => {
  it("dùng ảnh nền người dùng cung cấp cho màn hình đăng nhập", () => {
    expect(home).toContain('resolveLoginBackgroundUrl');
    expect(home).toContain('src={backgroundUrl}');
  });

  it("hiển thị TCG MANAGER với lớp hiệu ứng RGB dùng chung", () => {
    expect(home).toContain('className="tcg-logo-text');
    expect(home).toMatch(/>\s+TCG MANAGER\s+<\/h1>/);
  });

  it("đặt logo gần ô phiên bản và dùng chuyển cảnh RGB khi bắt đầu", () => {
    expect(home).toContain('login-rgb-transition-overlay');
    expect(home).toContain('whitespace-nowrap');
    expect(home).toContain('text-[clamp(1.75rem,8vw,3.75rem)]');
    expect(home).toContain('pb-[clamp(9rem,20vh,15.5rem)]');
    expect(home).toContain('Phiên bản v1.1');
    expect(home).toContain('setTimeout(() => {');
    expect(home).toContain('}, 520);');
  });

  it("có lớp tương tác logo và chỉ báo xử lý trên nút Bắt đầu", () => {
    expect(home).toContain('login-tcg-logo');
    expect(home).toContain('Đang xử lý...');
    expect(home).toContain('login-background-image');
  });
});
