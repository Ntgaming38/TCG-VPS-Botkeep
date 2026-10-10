import { describe, expect, it } from "vitest";
import { matchesDashboardChyusenFilter } from "../shared/chyusenDashboardFilter";

describe("matchesDashboardChyusenFilter", () => {
  it("lọc Sắp hết hạn theo ngày lịch Nhật Bản và gồm cả mục đã đăng ký", () => {
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 86_400_000);
    const later = new Date(today.getTime() + 3 * 86_400_000);

    expect(matchesDashboardChyusenFilter({ timeState: "expiring", applicationStatus: "registered", applicationEnd: today }, "dashboard_expiring")).toBe(true);
    expect(matchesDashboardChyusenFilter({ timeState: "open", applicationStatus: "not_registered", applicationEnd: tomorrow }, "dashboard_expiring")).toBe(true);
    expect(matchesDashboardChyusenFilter({ timeState: "open", applicationStatus: "not_registered", applicationEnd: later }, "dashboard_expiring")).toBe(false);
  });

  it("lọc đúng các trạng thái Chờ kết quả, Đã trúng và Đã trượt trên Dashboard", () => {
    expect(matchesDashboardChyusenFilter({ timeState: "open", applicationStatus: "registered" }, "dashboard_waiting")).toBe(true);
    expect(matchesDashboardChyusenFilter({ timeState: "waiting_result", applicationStatus: "not_registered" }, "dashboard_waiting")).toBe(true);
    expect(matchesDashboardChyusenFilter({ timeState: "result_ready", applicationStatus: "won" }, "dashboard_won")).toBe(true);
    expect(matchesDashboardChyusenFilter({ timeState: "expired", applicationStatus: "lost" }, "dashboard_lost")).toBe(true);
  });
});
