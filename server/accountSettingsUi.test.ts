import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

describe("account settings UI", () => {
  it("cho phép đổi nickname và ảnh đại diện từ khu vực tài khoản", () => {
    const source = readFileSync(join(root, "client/src/components/AccountSettingsDialog.tsx"), "utf8");
    const sidebar = readFileSync(join(root, "client/src/components/DashboardLayout.tsx"), "utf8");
    expect(source).toContain("Tên hiển thị / Nickname");
    expect(source).toContain("auth.uploadAvatar");
    expect(source).toContain("auth.updateProfile");
    expect(source).toContain("AVATAR_BORDER_PRESETS");
    expect(source).toContain("Cắt và căn ảnh đại diện");
    expect(source).toContain("Thiết bị đăng nhập gần đây");
    expect(source).toContain("Đăng nhập qua");
    expect(source).toContain("Sao chép email tài khoản");
    expect(source).toContain("Thiết bị đăng nhập gần đây");
    expect(source).toContain("Đăng xuất khỏi tất cả thiết bị");
    expect(source).toContain("Thiết bị hiện tại");
    expect(source).toContain("Globe2");
    expect(source).toContain("BrowserIcon");
    expect(source).toContain("Chrome");
    expect(source).toContain("DeviceIcon");
    expect(source).toContain("index === 0");
    expect(source).toContain("getSessionDeviceLabel(navigator.userAgent)");
    expect(sidebar).toContain("Cài đặt tài khoản");
    expect(sidebar).toContain("user?.nickname || user?.name");
  });

  it("nêu rõ mật khẩu được quản lý bởi nhà cung cấp OAuth", () => {
    const source = readFileSync(join(root, "client/src/components/AccountSettingsDialog.tsx"), "utf8");
    expect(source).toContain("TCG Manager không lưu mật khẩu riêng");
    expect(source).toContain("Hướng dẫn đổi mật khẩu Google");
    expect(source).toContain("support.google.com/accounts/answer/41078");
    expect(source).toContain("Chọn <strong>Đổi mật khẩu</strong>");
  });
});
