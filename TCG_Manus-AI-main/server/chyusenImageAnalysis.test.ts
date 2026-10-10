import { describe, expect, it } from "vitest";
import { parseChyusenImageAnalysis } from "./chyusenImageAnalysis";

describe("parseChyusenImageAnalysis", () => {
  it("chỉ chấp nhận dữ liệu ảnh theo schema Chyusen", () => {
    const raw = JSON.stringify({ title: "Joshin 抽選", productName: "Pikachu Box", series: "Pokemon", productType: "box", shop: "Joshin", price: 5400, quantityLimit: "1 Box", applicationStart: null, applicationEnd: "2026-09-01T10:00:00+09:00", resultDate: "2026-09-05T12:00:00+09:00", pickupStart: null, pickupNote: "Đầu tháng 9", requirements: null, fieldConfidence: { title: "high", applicationEnd: "medium", pickupNote: "low" }, note: "Đọc từ ảnh" });
    expect(parseChyusenImageAnalysis(raw)).toMatchObject({ title: "Joshin 抽選", pickupNote: "Đầu tháng 9", productType: "box", fieldConfidence: { title: "high" } });
  });
});
