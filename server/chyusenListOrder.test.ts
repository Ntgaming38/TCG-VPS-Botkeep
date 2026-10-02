import { describe, expect, it } from "vitest";
import { prioritizeChyusenDeadlineToday, sortChyusenByNearestResultDate } from "../shared/chyusenListOrder";

describe("prioritizeChyusenDeadlineToday", () => {
  it("đưa các mục có hạn từ hôm nay đến nhiều ngày sau theo thứ tự tăng dần", () => {
    const sorted = prioritizeChyusenDeadlineToday([
      { id: 1, applicationEnd: "2026-08-15T00:00:00+09:00" },
      { id: 2, applicationEnd: "2026-08-13T00:00:00+09:00" },
      { id: 3, applicationEnd: "2026-08-20T00:00:00+09:00" },
      { id: 4, applicationEnd: "2026-08-14T00:00:00+09:00" },
    ], new Date("2026-08-13T12:00:00+09:00"));

    expect(sorted.map((entry) => entry.id)).toEqual([2, 4, 1, 3]);
  });

  it("giữ ổn định các mục đã quá hạn hoặc chưa có hạn đăng ký", () => {
    const sorted = prioritizeChyusenDeadlineToday([
      { id: 1, applicationEnd: null },
      { id: 2, applicationEnd: "2026-08-12T00:00:00+09:00" },
      { id: 3, applicationEnd: "2026-08-14T00:00:00+09:00" },
    ], new Date("2026-08-13T12:00:00+09:00"));

    expect(sorted.map((entry) => entry.id)).toEqual([3, 1, 2]);
  });
});

describe("sortChyusenByNearestResultDate", () => {
  it("đưa ngày công bố hôm nay và các ngày sắp tới lên trước ngày cũ hoặc không có ngày", () => {
    const sorted = sortChyusenByNearestResultDate([
      { id: 1, resultDate: "2026-08-12T00:00:00+09:00" },
      { id: 2, resultDate: null },
      { id: 3, resultDate: "2026-08-17T00:00:00+09:00" },
      { id: 4, resultDate: "2026-08-18T00:00:00+09:00" },
    ], new Date("2026-08-17T10:00:00+09:00"));

    expect(sorted.map((entry) => entry.id)).toEqual([3, 4, 1, 2]);
  });
});
