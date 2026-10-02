import { describe, expect, it } from "vitest";
import { getDashboardProfitTone } from "../shared/dashboardProfitTone";

describe("màu chỉ số Lợi nhuận Tổng quan", () => {
  it("dùng xanh lá khi lợi nhuận dương", () => {
    expect(getDashboardProfitTone(1)).toBe("text-green-400");
  });

  it("dùng đỏ khi lợi nhuận âm", () => {
    expect(getDashboardProfitTone(-1)).toBe("text-red-400");
  });

  it("dùng hiệu ứng RGB khi lợi nhuận bằng 0", () => {
    expect(getDashboardProfitTone(0)).toBe("tcg-logo-text");
  });
});
