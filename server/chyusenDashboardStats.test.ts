import { describe, expect, it } from "vitest";
import { getNearestExpiringChyusen, getNearestRegistrableChyusen, summarizeChyusenDashboard } from "../shared/chyusenDashboardStats";

describe("summarizeChyusenDashboard", () => {
  it("đưa Chyusen đã đăng ký vào Chờ kết quả ngay cả khi hạn đăng ký chưa hết", () => {
    expect(summarizeChyusenDashboard([
      { timeState: "expiring", urgency: "deadline_24h", daysRemaining: 1, applicationStatus: "registered" },
      { timeState: "expiring", urgency: "deadline_72h", daysRemaining: 1, applicationStatus: "not_registered" },
      { timeState: "expiring", urgency: "deadline_24h", daysRemaining: 2, applicationStatus: "not_registered" },
      { timeState: "waiting_result", applicationStatus: "not_registered" },
      { timeState: "waiting_result", applicationStatus: "won" },
      { timeState: "expired", applicationStatus: "lost" },
    ])).toEqual({ waitingResult: 2, expiring: 2, deadlineToday: false, deadlineTomorrow: true, won: 1, lost: 1 });
  });

  it("chỉ bật các chỉ báo hạn khi có Chyusen chưa đăng ký đúng mốc ngày", () => {
    expect(summarizeChyusenDashboard([
      { timeState: "expiring", daysRemaining: 0, applicationStatus: "registered" },
      { timeState: "expiring", daysRemaining: 1, applicationStatus: "not_registered" },
    ])).toMatchObject({ expiring: 2, deadlineToday: true, deadlineTomorrow: true, waitingResult: 1 });
  });

  it("chọn Chyusen có hạn gần nhất, kể cả khi mục đó đã được đăng ký", () => {
    const nearest = getNearestExpiringChyusen([
      { title: "Hạn ngày mai", timeState: "expiring", daysRemaining: 1, applicationStatus: "not_registered" },
      { title: "Hạn hôm nay", timeState: "expiring", daysRemaining: 0, applicationStatus: "registered" },
    ]);

    expect(nearest?.title).toBe("Hạn hôm nay");
  });

  it("chỉ chọn mục chưa đăng ký có liên kết công khai cho thao tác Đăng ký ngay", () => {
    const nearest = getNearestRegistrableChyusen([
      { title: "Đã đăng ký", timeState: "expiring", daysRemaining: 0, applicationStatus: "registered", sourceUrl: "https://example.com/registered" },
      { title: "Chưa có link", timeState: "expiring", daysRemaining: 0, applicationStatus: "not_registered" },
      { title: "Đăng ký ngay", timeState: "expiring", daysRemaining: 1, applicationStatus: "not_registered", sourceUrl: "https://example.com/apply" },
    ]);

    expect(nearest?.title).toBe("Đăng ký ngay");
  });
});
