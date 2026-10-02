import { describe, expect, it } from "vitest";
import { getQuickSaleDateRange } from "../shared/salesQuickDateRange";

describe("salesQuickDateRange", () => {
  const currentDate = new Date(2026, 7, 15, 11, 30);

  it("tạo đúng khoảng Hôm nay", () => {
    expect(getQuickSaleDateRange("today", currentDate)).toEqual({ fromDate: "2026-08-15", toDate: "2026-08-15" });
  });

  it("tạo đúng khoảng Tuần này từ thứ Hai đến hôm nay", () => {
    expect(getQuickSaleDateRange("week", currentDate)).toEqual({ fromDate: "2026-08-10", toDate: "2026-08-15" });
  });

  it("tạo đúng khoảng Tháng này từ ngày đầu tháng đến hôm nay", () => {
    expect(getQuickSaleDateRange("month", currentDate)).toEqual({ fromDate: "2026-08-01", toDate: "2026-08-15" });
  });
});
