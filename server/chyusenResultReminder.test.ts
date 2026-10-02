import { describe, expect, it } from "vitest";
import { formatChyusenResultCheckedAt, formatChyusenResultCountdown, isChyusenResultAnnouncementToday, isChyusenResultCheckOverdue } from "../shared/chyusenResultReminder";

describe("Chyusen result reminder", () => {
  const now = new Date("2026-08-17T10:00:00+09:00");

  it("nhắc Chyusen chờ kết quả đúng ngày công bố theo lịch Nhật", () => {
    expect(isChyusenResultAnnouncementToday({ applicationStatus: "registered", resultStatus: "pending", resultDate: "2026-08-17T00:00:00+09:00" }, now)).toBe(true);
  });

  it("không nhắc mục đã có kết quả hoặc chưa đến ngày", () => {
    expect(isChyusenResultAnnouncementToday({ applicationStatus: "registered", resultStatus: "pending", resultDate: "2026-08-18T00:00:00+09:00" }, now)).toBe(false);
    expect(isChyusenResultAnnouncementToday({ applicationStatus: "won", resultStatus: "won", resultDate: "2026-08-17T00:00:00+09:00" }, now)).toBe(false);
  });

  it("định dạng số ngày còn lại đến ngày công bố", () => {
    expect(formatChyusenResultCountdown("2026-08-17T00:00:00+09:00", now)).toBe("Hôm nay công bố kết quả");
    expect(formatChyusenResultCountdown("2026-08-19T00:00:00+09:00", now)).toBe("Còn 2 ngày đến công bố");
    expect(formatChyusenResultCountdown("2026-08-16T00:00:00+09:00", now)).toBe("Đã đến ngày công bố");
  });

  it("cảnh báo đúng mục quá ngày công bố nhưng chưa kiểm tra", () => {
    expect(isChyusenResultCheckOverdue({ applicationStatus: "registered", resultStatus: "pending", resultDate: "2026-08-16T00:00:00+09:00" }, now)).toBe(true);
    expect(isChyusenResultCheckOverdue({ applicationStatus: "registered", resultStatus: "pending", resultDate: "2026-08-16T00:00:00+09:00", resultCheckedAt: "2026-08-17T08:00:00+09:00" }, now)).toBe(false);
    expect(isChyusenResultCheckOverdue({ applicationStatus: "won", resultStatus: "won", resultDate: "2026-08-16T00:00:00+09:00" }, now)).toBe(false);
  });

  it("định dạng thời điểm kiểm tra chi tiết theo giờ Nhật", () => {
    expect(formatChyusenResultCheckedAt("2026-08-17T10:30:00+09:00")).toBe("17/08/2026 10:30 JST");
  });
});
