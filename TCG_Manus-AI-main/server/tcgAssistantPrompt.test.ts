import { describe, expect, it } from "vitest";
import {
  buildTcgAssistantSystemPrompt,
  TCG_ASSISTANT_SYSTEM_PROMPT,
} from "./tcgAssistantPrompt";

describe("TCG assistant system prompt", () => {
  it("bao gồm quy trình phân tích 5 bước và các nguyên tắc chống suy đoán", () => {
    expect(TCG_ASSISTANT_SYSTEM_PROMPT).toContain("QUY TRÌNH PHÂN TÍCH BẮT BUỘC");
    expect(TCG_ASSISTANT_SYSTEM_PROMPT).toContain("1. Xác định Card");
    expect(TCG_ASSISTANT_SYSTEM_PROMPT).toContain("5. Kết thúc bằng 1–2 bước kiểm tra");
    expect(TCG_ASSISTANT_SYSTEM_PROMPT).toContain("Không tự tạo giá, số lượng, ROI");
    expect(TCG_ASSISTANT_SYSTEM_PROMPT).toContain("Không bảo đảm lợi nhuận");
    expect(TCG_ASSISTANT_SYSTEM_PROMPT).toContain("¥");
  });

  it("đính kèm chính xác ngữ cảnh kho hàng được cung cấp", () => {
    const context = {
      dashboard: { totalProfit: 12500 },
      topCardsAnalysis: [{ name: "Pikachu ex", roi: 18.4 }],
    };

    const prompt = buildTcgAssistantSystemPrompt(context);

    expect(prompt).toContain("NGỮ CẢNH KHO HÀNG & TÀI CHÍNH:");
    expect(prompt).toContain(JSON.stringify(context));
  });
});
