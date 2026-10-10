import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./chyusenDb", () => ({
  getChyusenMonitorConfig: vi.fn(),
  getChyusenSource: vi.fn(),
  listDueChyusenSources: vi.fn(),
  getChyusenNotificationSettings: vi.fn(),
  recordChyusenSourceHistory: vi.fn(),
  updateChyusenSourceStatus: vi.fn(),
  createChyusenNotification: vi.fn(),
}));
vi.mock("./chyusenSource", () => ({ fetchPublicChyusenSource: vi.fn() }));
vi.mock("./db", () => ({ getDb: vi.fn() }));

import * as chyusenDb from "./chyusenDb";
import { getDb } from "./db";
import { fetchPublicChyusenSource } from "./chyusenSource";
import { checkChyusenSourceNow, runChyusenMonitor } from "./chyusenMonitor";

describe("runChyusenMonitor", () => {
  const taskUid = "task-chyusen-test";
  const notifications: any[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-13T00:00:00.000Z"));
    notifications.length = 0;
    vi.mocked(chyusenDb.getChyusenMonitorConfig).mockResolvedValue({ scheduleCronTaskUid: taskUid, isEnabled: 1 } as any);
    vi.mocked(chyusenDb.listDueChyusenSources).mockResolvedValue([{
      id: 9, entryId: 7, userId: 4, sourceUrl: "https://joshinweb.jp/game/lottery", label: "Joshin", contentHash: "old-hash", checkIntervalMinutes: 60, failureCount: 0, detectedCount: 0,
    }] as any);
    vi.mocked(chyusenDb.getChyusenNotificationSettings).mockResolvedValue({ lotteryChanged: 1, lotteryExpiring: 1, lotteryResult: 1, deadlineHours: [3] } as any);
    vi.mocked(fetchPublicChyusenSource).mockResolvedValue({ contentHash: "new-hash" } as any);
    vi.mocked(chyusenDb.createChyusenNotification).mockImplementation(async (notification: any) => { notifications.push(notification); });
    const where = vi.fn()
      .mockResolvedValueOnce([{ id: 7, userId: 4, title: "Card A", applicationStatus: "not_registered", applicationEnd: new Date("2026-08-13T02:00:00.000Z") }])
      .mockResolvedValueOnce([{ id: 8, userId: 4, title: "Box B", resultStatus: "pending", resultDate: new Date("2026-08-13T04:00:00.000Z") }]);
    vi.mocked(getDb).mockResolvedValue({ select: () => ({ from: () => ({ where }) }) } as any);
  });

  afterEach(() => vi.useRealTimers());

  it("chỉ kiểm tra nguồn đến hạn và tạo nhắc hạn, nhắc công bố theo cài đặt", async () => {
    const summary = await runChyusenMonitor(taskUid);

    expect(summary).toMatchObject({ sourcesChecked: 1, sourceChanges: 1, remindersCreated: 2, unavailableSources: 0 });
    expect(vi.mocked(chyusenDb.listDueChyusenSources)).toHaveBeenCalled();
    expect(vi.mocked(chyusenDb.updateChyusenSourceStatus)).toHaveBeenCalledWith(9, expect.objectContaining({ latestStatus: "detected", contentHash: "new-hash", failureCount: 0, detectedCount: 1 }));
    expect(vi.mocked(chyusenDb.recordChyusenSourceHistory)).toHaveBeenCalledWith(expect.objectContaining({ sourceId: 9, previousHash: "old-hash", currentHash: "new-hash", changeType: "content_changed" }));
    expect(notifications.map((notification) => notification.notificationKey)).toEqual([
      "source-changed:9:new-hash",
      "deadline_3h:7",
      "result-day:8:2026-08-13T04:00:00.000Z",
    ]);
  });

  it("bỏ qua callback có task UID không khớp để giữ monitor idempotent và an toàn", async () => {
    const summary = await runChyusenMonitor("task-khac");

    expect(summary).toEqual({ sourcesChecked: 0, sourceChanges: 0, remindersCreated: 0, unavailableSources: 0 });
    expect(fetchPublicChyusenSource).not.toHaveBeenCalled();
    expect(notifications).toEqual([]);
  });

  it("kiểm tra ngay chỉ nguồn thuộc tài khoản và trả trạng thái mới", async () => {
    vi.mocked(chyusenDb.getChyusenSource).mockResolvedValue({
      id: 9, userId: 4, entryId: 7, sourceUrl: "https://joshinweb.jp/game/lottery", label: "Joshin", contentHash: "old-hash", checkIntervalMinutes: 60, failureCount: 0, detectedCount: 0,
    } as any);
    vi.mocked(fetchPublicChyusenSource).mockResolvedValue({ contentHash: "old-hash" } as any);

    await expect(checkChyusenSourceNow(4, 9)).resolves.toMatchObject({ sourceId: 9, changed: false, unavailable: false, latestStatus: "monitoring" });
    expect(chyusenDb.getChyusenSource).toHaveBeenCalledWith(4, 9);
    expect(chyusenDb.updateChyusenSourceStatus).toHaveBeenCalledWith(9, expect.objectContaining({ latestStatus: "monitoring", latestError: null, failureCount: 0 }));
  });

  it("lưu lỗi gần nhất khi kiểm tra ngay không truy cập được nguồn", async () => {
    vi.mocked(chyusenDb.getChyusenSource).mockResolvedValue({
      id: 9, userId: 4, sourceUrl: "https://joshinweb.jp/game/lottery", label: "Joshin", checkIntervalMinutes: 60, failureCount: 1,
    } as any);
    vi.mocked(fetchPublicChyusenSource).mockRejectedValue(new Error("HTTP 503"));

    await expect(checkChyusenSourceNow(4, 9)).resolves.toMatchObject({ unavailable: true, latestStatus: "unavailable", latestError: "HTTP 503" });
    expect(chyusenDb.updateChyusenSourceStatus).toHaveBeenCalledWith(9, expect.objectContaining({ latestStatus: "unavailable", latestError: "HTTP 503", failureCount: 2 }));
  });
});
