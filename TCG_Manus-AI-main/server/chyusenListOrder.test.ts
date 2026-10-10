import { describe, expect, it } from "vitest";
import { prioritizeChyusenDeadlineToday } from "../shared/chyusenListOrder";

describe("prioritizeChyusenDeadlineToday", () => {
  it("đưa các mục có hạn trong hôm nay lên đầu và giữ nguyên thứ tự các mục khác", () => {
    const sorted = prioritizeChyusenDeadlineToday([
      { id: 1, applicationEnd: "2026-08-15T00:00:00+09:00" },
      { id: 2, applicationEnd: "2026-08-13T00:00:00+09:00" },
      { id: 3, applicationEnd: "2026-08-20T00:00:00+09:00" },
    ], new Date("2026-08-13T12:00:00+09:00"));

    expect(sorted.map((entry) => entry.id)).toEqual([2, 1, 3]);
  });
});
