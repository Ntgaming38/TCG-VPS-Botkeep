import { describe, expect, it } from "vitest";
import { getDashboardMonthlyTrend } from "../shared/dashboardMonthlyTrend";

describe("xu hướng chỉ số Tổng quan theo tháng", () => {
  it("tính đúng phần trăm tăng, giảm và không đổi", () => {
    expect(getDashboardMonthlyTrend(120, 100)).toEqual({ percent: 20, direction: "up" });
    expect(getDashboardMonthlyTrend(75, 100)).toEqual({ percent: -25, direction: "down" });
    expect(getDashboardMonthlyTrend(100, 100)).toEqual({ percent: 0, direction: "flat" });
  });

  it("ghi nhận mục mới khi tháng trước chưa có dữ liệu", () => {
    expect(getDashboardMonthlyTrend(50, 0)).toEqual({ percent: null, direction: "new" });
    expect(getDashboardMonthlyTrend(0, 0)).toEqual({ percent: 0, direction: "flat" });
  });
});
