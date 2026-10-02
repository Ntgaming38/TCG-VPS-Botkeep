import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("trang Chyusen gọn", () => {
  it("không còn hiển thị khối Thông báo Chyusen nhưng Trung tâm Thông báo vẫn tồn tại riêng", () => {
    const chyusenPage = readFileSync(join(process.cwd(), "client/src/pages/Chyusen.tsx"), "utf8");
    const notificationCenter = readFileSync(join(process.cwd(), "client/src/components/NotificationCenter.tsx"), "utf8");

    expect(chyusenPage).not.toContain("Thông báo Chyusen (");
    expect(chyusenPage).not.toContain("markAllNotificationsRead.useMutation");
    expect(chyusenPage).not.toContain("markNotificationRead.useMutation");
    expect(notificationCenter).toContain("markAllNotificationsRead.useMutation");
    expect(notificationCenter).toContain("markNotificationRead.useMutation");
  });
});
