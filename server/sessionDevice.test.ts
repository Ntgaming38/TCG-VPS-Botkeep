import { describe, expect, it } from "vitest";
import { getSessionDeviceLabel, LOGOUT_ALL_CONFIRMATION } from "../shared/sessionDevice";

describe("session devices", () => {
  it("nhận diện thiết bị và trình duyệt từ user agent", () => {
    expect(getSessionDeviceLabel("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit Safari/604.1")).toBe("iPhone / iPad · Safari");
    expect(getSessionDeviceLabel("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit Chrome/120.0")).toBe("Windows · Chrome");
  });

  it("dùng cụm từ xác nhận riêng cho đăng xuất mọi thiết bị", () => {
    expect(LOGOUT_ALL_CONFIRMATION).toBe("ĐĂNG XUẤT TẤT CẢ");
  });
});
