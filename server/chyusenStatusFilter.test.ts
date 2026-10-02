import { describe, expect, it } from "vitest";
import { countChyusenStatusFilters, matchesChyusenStatusFilter } from "../shared/chyusenStatusFilter";

describe("bộ đếm bộ lọc trạng thái Chyusen", () => {
  const entries = [
    { applicationStatus: "registered", resultStatus: null, timeState: "open" },
    { applicationStatus: "not_registered", resultStatus: null, timeState: "waiting_result" },
    { applicationStatus: "not_registered", resultStatus: null, timeState: "open" },
    { applicationStatus: "won", resultStatus: "won", timeState: "result_ready" },
    { applicationStatus: "lost", resultStatus: "lost", timeState: "expired" },
  ];

  it("đếm mục Chờ kết quả theo cùng quy tắc với Tổng quan", () => {
    const counts = countChyusenStatusFilters(entries);

    expect(counts.all).toBe(5);
    expect(counts.waiting_result).toBe(2);
    expect(counts.registered).toBe(1);
    expect(counts.won).toBe(1);
    expect(counts.lost).toBe(1);
  });

  it("không đưa mục đang mở nhưng chưa đăng ký vào Chờ kết quả", () => {
    expect(matchesChyusenStatusFilter(entries[2], "waiting_result")).toBe(false);
    expect(matchesChyusenStatusFilter(entries[2], "open")).toBe(true);
  });
});
