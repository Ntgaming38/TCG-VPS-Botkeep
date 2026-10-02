import { describe, expect, it } from "vitest";
import { shouldOpenMobileSidebarFromSwipe } from "../shared/mobileSidebarGesture";

describe("mobile sidebar edge swipe", () => {
  it("mở sidebar khi vuốt ngang đủ xa từ mép trái", () => {
    expect(shouldOpenMobileSidebarFromSwipe({ startX: 18, startY: 280, endX: 110, endY: 287 })).toBe(true);
  });

  it("không kích hoạt khi thao tác bắt đầu ngoài mép trái hoặc chủ yếu là cuộn dọc", () => {
    expect(shouldOpenMobileSidebarFromSwipe({ startX: 60, startY: 280, endX: 170, endY: 285 })).toBe(false);
    expect(shouldOpenMobileSidebarFromSwipe({ startX: 12, startY: 280, endX: 82, endY: 390 })).toBe(false);
  });
});
