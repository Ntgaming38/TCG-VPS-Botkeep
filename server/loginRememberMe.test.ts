import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const login = readFileSync(join(root, "client/src/pages/Login.tsx"), "utf8");

describe("Ghi nhớ đăng nhập 30 ngày (remember-me)", () => {
  it("lưu email + mật khẩu vào localStorage và tự điền lại sau khi đăng xuất", () => {
    expect(login).toContain('const REMEMBER_LOGIN_KEY = "tcg.remember_login"');
    expect(login).toContain("30 * 24 * 60 * 60 * 1000");
    expect(login).toContain("writeRememberedLogin(email.trim(), password)");
    expect(login).toContain('useState(() => readRememberedLogin()?.email ?? "")');
    expect(login).toContain('useState(() => readRememberedLogin()?.password ?? "")');
    expect(login).toContain("useState(() => Boolean(readRememberedLogin()))");
  });

  it("tự xóa dữ liệu ghi nhớ khi đăng nhập mà bỏ tick và khi dữ liệu quá hạn", () => {
    expect(login).toContain("else clearRememberedLogin();");
    expect(login).toContain("if (Date.now() - parsed.savedAt > REMEMBER_LOGIN_TTL_MS)");
    expect(login).toContain("localStorage.removeItem(REMEMBER_LOGIN_KEY)");
  });

  it("giữ nguyên autocomplete cho trình duyệt quản lý mật khẩu", () => {
    expect(login).toContain('autoComplete="username email"');
    expect(login).toContain('autoComplete={screen === "login" ? "current-password" : "new-password"}');
    expect(login).toContain("Ghi nhớ đăng nhập trên thiết bị này (30 ngày)");
  });
});
