import { describe, expect, it } from "vitest";
import { getUnreadChyusenCount } from "../shared/chyusenNotifications";

describe("Chyusen notification badge", () => {
  it("chỉ đếm thông báo chưa đọc cho badge sidebar", () => {
    expect(getUnreadChyusenCount([{ isRead: 0 }, { isRead: 1 }, { isRead: false }, { isRead: true }])).toBe(2);
    expect(getUnreadChyusenCount([])).toBe(0);
    expect(getUnreadChyusenCount(undefined)).toBe(0);
  });
});
