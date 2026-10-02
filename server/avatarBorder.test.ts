import { describe, expect, it } from "vitest";
import { AVATAR_BORDER_PRESETS, normalizeAvatarBorderColor } from "@shared/avatarBorder";

describe("avatar border colors", () => {
  it("giữ màu preset hợp lệ và quay về màu xanh lá mặc định nếu không hợp lệ", () => {
    expect(AVATAR_BORDER_PRESETS).toHaveLength(6);
    expect(normalizeAvatarBorderColor("#a855f7")).toBe("#a855f7");
    expect(normalizeAvatarBorderColor("#invalid")).toBe("#22c55e");
  });
});
