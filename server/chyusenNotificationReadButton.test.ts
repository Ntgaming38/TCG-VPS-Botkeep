import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("chyusen notification read button", () => {
  it("không còn nút Đã xem trong trang Chyusen, nhưng Trung tâm Thông báo vẫn quản lý trạng thái đọc", () => {
    const chyusenPage = readFileSync(join(process.cwd(), "client/src/pages/Chyusen.tsx"), "utf8");
    const notificationCenter = readFileSync(join(process.cwd(), "client/src/components/NotificationCenter.tsx"), "utf8");

    expect(chyusenPage).not.toContain("Thông báo Chyusen (");
    expect(chyusenPage).not.toContain("markNotificationRead.useMutation");
    expect(notificationCenter).toContain("markRead.mutate({ id: notification.id })");
    expect(notificationCenter).toContain("markAllRead.mutate()");
  });
});
