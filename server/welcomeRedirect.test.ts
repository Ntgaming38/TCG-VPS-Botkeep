import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const welcome = readFileSync(join(root, "client/src/pages/Welcome.tsx"), "utf8");

describe("Trang gốc (/) khi đã đăng nhập", () => {
  it("Welcome kiểm tra phiên đăng nhập bằng useAuth", () => {
    expect(welcome).toContain('from "@/_core/hooks/useAuth"');
    expect(welcome).toContain("useAuth()");
  });

  it("đã đăng nhập thì tự chuyển vào /thong-ke, không dừng ở Welcome", () => {
    expect(welcome).toContain('if (!loading && user) setLocation("/thong-ke")');
  });

  it("chưa đăng nhập thì vẫn hiện Welcome như cũ (nút bắt đầu còn đó)", () => {
    expect(welcome).toContain("handleStart");
    expect(welcome).toContain('setLocation("/choose-franchise")');
  });
});
