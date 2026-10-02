import { describe, expect, it } from "vitest";
import { getChyusenNotificationFilterGroup, matchesChyusenNotificationFilter, selectChyusenNotificationsByReadTab, shouldPlayChyusenAlert } from "@shared/chyusenNotificationFilter";

describe("chyusen notification controls", () => {
  it("phân loại hạn đăng ký và kết quả để lọc thông báo", () => {
    expect(getChyusenNotificationFilterGroup("deadline_24h")).toBe("deadline");
    expect(getChyusenNotificationFilterGroup("result_day")).toBe("result");
    expect(matchesChyusenNotificationFilter("deadline_3h", "deadline")).toBe(true);
    expect(matchesChyusenNotificationFilter("source_changed", "result")).toBe(false);
  });

  it("chỉ phát âm thanh khi tùy chọn tương ứng được bật", () => {
    expect(shouldPlayChyusenAlert({ priority: "medium", soundNewEnabled: true })).toBe(true);
    expect(shouldPlayChyusenAlert({ priority: "critical", soundUrgentEnabled: true })).toBe(true);
    expect(shouldPlayChyusenAlert({ priority: "critical", soundNewEnabled: true, soundUrgentEnabled: false })).toBe(false);
  });

  it("giữ lịch sử Đã xem tách riêng khỏi thông báo chưa xem", () => {
    const notifications = [{ id: 1, isRead: 0 }, { id: 2, isRead: 1 }, { id: 3, isRead: true }];
    expect(selectChyusenNotificationsByReadTab(notifications, "unread").map((notification) => notification.id)).toEqual([1]);
    expect(selectChyusenNotificationsByReadTab(notifications, "read").map((notification) => notification.id)).toEqual([2, 3]);
  });
});
