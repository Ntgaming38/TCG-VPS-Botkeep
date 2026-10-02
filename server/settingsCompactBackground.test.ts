import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const settings = readFileSync(new URL("../client/src/pages/Settings.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");

describe("compact settings and login background editor", () => {
  it("hiển thị công cụ chỉnh ảnh trước khi lưu và lịch sử nền gần đây", () => {
    expect(settings).toContain("Cắt và chỉnh ảnh trước khi lưu");
    expect(settings).toContain("renderLoginBackgroundDataUrl");
    expect(settings).toContain("Nền đã tải gần đây");
    expect(settings).toContain("rememberLoginBackgroundUrl");
  });

  it("khởi tạo các nhóm Cài đặt ở trạng thái thu gọn", () => {
    expect(settings).toContain("collapsedSettingsSections");
    expect(settings).toContain('data-collapsed={collapsedSettingsSections');
    expect(css).toContain('.settings-collapsible-panel[data-collapsed="true"] > :not([data-settings-header])');
  });

  it("yêu cầu xác nhận trước khi xóa nền gần đây", () => {
    expect(settings).toContain("Bạn có chắc chắn muốn xóa?");
    expect(settings).toContain("pendingBackgroundRemoval");
    expect(settings).toContain("Xóa nền");
  });
});
