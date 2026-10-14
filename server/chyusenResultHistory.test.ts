import { describe, expect, it } from "vitest";
import { formatChyusenResultDate, getChyusenResultOutcome, summarizeChyusenResultHistory } from "../shared/chyusenResultHistory";

describe("phân loại lịch sử kết quả Chūsen", () => {
  it("ưu tiên Đã trúng dù trạng thái khác không nhất quán", () => {
    expect(getChyusenResultOutcome({ id: 1, applicationStatus: "won", resultStatus: "pending", deletedAt: null })).toBe("won");
    expect(getChyusenResultOutcome({ id: 2, applicationStatus: "registered", resultStatus: "won", deletedAt: null })).toBe("won");
  });

  it("ưu tiên Hủy trên Trượt và loại lượt chưa có kết quả", () => {
    expect(getChyusenResultOutcome({ id: 3, applicationStatus: "cancelled", resultStatus: "lost", deletedAt: null })).toBe("cancelled");
    expect(getChyusenResultOutcome({ id: 4, applicationStatus: "lost", resultStatus: "lost", deletedAt: new Date() })).toBe("lost");
    expect(getChyusenResultOutcome({ id: 5, applicationStatus: "registered", resultStatus: "pending", deletedAt: null })).toBeNull();
    expect(getChyusenResultOutcome({ id: 6, applicationStatus: "not_registered", resultStatus: "pending", deletedAt: null })).toBeNull();
  });

  it("thống kê tổng, từng trạng thái và tỷ lệ trúng không tính lượt hủy", () => {
    const stats = summarizeChyusenResultHistory(["won", "won", "lost", "cancelled"]);
    expect(stats).toMatchObject({ total: 4, won: 2, lost: 1, cancelled: 1, winRate: 2 / 3 });
  });

  it("trả về tỷ lệ trúng null khi chỉ còn lượt hủy", () => {
    const stats = summarizeChyusenResultHistory(["cancelled"]);
    expect(stats).toMatchObject({ total: 1, won: 0, lost: 0, cancelled: 1, winRate: null });
  });

  it("định dạng ngày kèm năm và trả về null khi không có giá trị", () => {
    expect(formatChyusenResultDate("2025-12-31T15:00:00.000Z")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(formatChyusenResultDate(null)).toBeNull();
    expect(formatChyusenResultDate(undefined)).toBeNull();
    expect(formatChyusenResultDate("khong-phai-ngay")).toBeNull();
  });
});
