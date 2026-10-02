import { describe, expect, it } from "vitest";
import { normalizeAiCurrencyToYen } from "../shared/aiCurrency";

describe("normalizeAiCurrencyToYen", () => {
  it("chuyển hậu tố VNĐ/VND của phản hồi cũ sang ký hiệu yên", () => {
    expect(normalizeAiCurrencyToYen("Lợi nhuận -26.611 VNĐ, vốn 251,886 VND.")).toBe("Lợi nhuận - 26.611 ¥, vốn 251,886 ¥.");
  });
});
