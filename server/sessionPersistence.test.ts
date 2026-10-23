import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_SESSION_MS, REMEMBERED_SESSION_MS } from "../shared/const";

const root = process.cwd();
const localAuth = readFileSync(join(root, "server/_core/localAuth.ts"), "utf8");
const emailAuthRoutes = readFileSync(join(root, "server/_core/emailAuthRoutes.ts"), "utf8");

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

describe("Phiên đăng nhập email/mật khẩu phải bền qua việc đóng app", () => {
  it("phiên mặc định kéo dài 30 ngày (không còn 12 giờ)", () => {
    expect(DEFAULT_SESSION_MS).toBe(THIRTY_DAYS_MS);
    expect(REMEMBERED_SESSION_MS).toBe(THIRTY_DAYS_MS);
  });

  it("cookie phiên luôn có Max-Age ở cả hai luồng đăng nhập, không phụ thuộc remember-me", () => {
    // Mẫu cũ khiến cookie thành session-cookie bị trình duyệt/PWA xoá khi đóng app.
    const conditionalPattern = /rememberMe \? \{ maxAge: expiresInMs \} : \{\}/;
    expect(localAuth).not.toMatch(conditionalPattern);
    expect(emailAuthRoutes).not.toMatch(conditionalPattern);
    expect(localAuth).toContain("maxAge: expiresInMs });");
    expect(emailAuthRoutes).toContain("maxAge: expiresInMs });");
  });
});
