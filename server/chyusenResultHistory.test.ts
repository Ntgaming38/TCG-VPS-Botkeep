import { describe, expect, it } from "vitest";
import { formatChyusenResultDate, getChyusenResultOutcome, resolveChyusenShopName, summarizeChyusenResultHistory, summarizeChyusenShopStats } from "../shared/chyusenResultHistory";

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

describe("thống kê Chūsen theo cửa hàng", () => {
  it("lấy tên cửa hàng chuẩn, ưu tiên tên tự nhập và gộp khoảng trắng", () => {
    expect(resolveChyusenShopName({ shop: "Joshin", customShopName: null })).toBe("Joshin");
    expect(resolveChyusenShopName({ shop: "Joshin", customShopName: "  Joshin  Shibuya  " })).toBe("Joshin Shibuya");
    expect(resolveChyusenShopName({ shop: null, customShopName: null })).toBe("Khác");
  });

  it("tách thống kê riêng cho từng cửa hàng, không gộp cửa hàng khác tên", () => {
    const stats = summarizeChyusenShopStats([
      { id: 1, shop: "Joshin", applicationStatus: "won", resultStatus: "won", deletedAt: null },
      { id: 2, shop: "Joshin", applicationStatus: "lost", resultStatus: "lost", deletedAt: new Date() },
      { id: 3, shop: "Joshin", applicationStatus: "registered", resultStatus: "pending", deletedAt: null },
      { id: 4, shop: "Joshin", applicationStatus: "cancelled", resultStatus: "pending", deletedAt: null },
      { id: 5, shop: "Geo", applicationStatus: "lost", resultStatus: "lost", deletedAt: new Date() },
    ]);
    expect(stats.Joshin).toMatchObject({ total: 4, won: 1, lost: 1, cancelled: 1, pending: 1, sampleSize: 2, winRate: 1 / 2 });
    expect(stats.Geo).toMatchObject({ total: 1, won: 0, lost: 1, cancelled: 0, pending: 0, sampleSize: 1, winRate: 0 });
  });

  it("cửa hàng mới chỉ có lượt chờ kết quả thì tỷ lệ trúng là Chưa đủ dữ liệu", () => {
    const stats = summarizeChyusenShopStats([
      { id: 1, shop: "ShopMoi", applicationStatus: "registered", resultStatus: "pending", deletedAt: null },
      { id: 2, shop: "ShopMoi", applicationStatus: "registered", resultStatus: "pending", deletedAt: null },
    ]);
    expect(stats.ShopMoi).toMatchObject({ total: 2, won: 0, lost: 0, cancelled: 0, pending: 2, sampleSize: 0, winRate: null });
  });

  it("không tính lượt hủy vào mẫu số tỷ lệ trúng", () => {
    const stats = summarizeChyusenShopStats([
      { id: 1, shop: "Joshin", applicationStatus: "won", resultStatus: "won", deletedAt: null },
      { id: 2, shop: "Joshin", applicationStatus: "cancelled", resultStatus: "pending", deletedAt: null },
      { id: 3, shop: "Joshin", applicationStatus: "cancelled", resultStatus: "pending", deletedAt: null },
    ]);
    // 1 trúng, 2 hủy → mẫu số chỉ 1 (không cộng hủy) → 100%
    expect(stats.Joshin).toMatchObject({ won: 1, cancelled: 2, sampleSize: 1, winRate: 1 });
  });
});
