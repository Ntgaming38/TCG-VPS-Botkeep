import { describe, expect, it } from "vitest";
import { shouldTriggerPullToRefresh } from "../shared/pullToRefresh";

describe("pull to refresh", () => {
  it("chỉ kích hoạt khi vuốt dọc đủ xa từ đỉnh trang", () => {
    expect(shouldTriggerPullToRefresh({ startX: 100, startY: 100, endX: 105, endY: 180, scrollTop: 0 })).toBe(true);
    expect(shouldTriggerPullToRefresh({ startX: 100, startY: 100, endX: 105, endY: 160, scrollTop: 0 })).toBe(false);
    expect(shouldTriggerPullToRefresh({ startX: 100, startY: 100, endX: 160, endY: 160, scrollTop: 0 })).toBe(false);
    expect(shouldTriggerPullToRefresh({ startX: 100, startY: 100, endX: 105, endY: 180, scrollTop: 8 })).toBe(false);
    expect(shouldTriggerPullToRefresh({ startX: 100, startY: 100, endX: 105, endY: 180, scrollTop: 0, disabled: true })).toBe(false);
  });
});
