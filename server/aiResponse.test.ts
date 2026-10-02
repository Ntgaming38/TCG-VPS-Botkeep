import { describe, expect, it } from "vitest";
import { extractAssistantText } from "./aiResponse";

describe("extractAssistantText", () => {
  it("trả về nội dung chuỗi đã được trim", () => {
    const result = extractAssistantText({
      id: "test",
      created: 0,
      model: "claude-haiku-4-5",
      choices: [{
        index: 0,
        message: { role: "assistant", content: "  Phân tích ROI của bạn.  " },
        finish_reason: "stop",
      }],
    });

    expect(result).toBe("Phân tích ROI của bạn.");
  });

  it("ghép các text content parts khi mô hình không trả về chuỗi trực tiếp", () => {
    const result = extractAssistantText({
      id: "test",
      created: 0,
      model: "claude-haiku-4-5",
      choices: [{
        index: 0,
        message: {
          role: "assistant",
          content: [
            { type: "text", text: "Phần một" },
            { type: "image_url", image_url: { url: "https://example.com/card.png" } },
            { type: "text", text: "Phần hai" },
          ],
        },
        finish_reason: "stop",
      }],
    });

    expect(result).toBe("Phần một\nPhần hai");
  });

  it("trả về null khi mô hình không có nội dung hiển thị", () => {
    const result = extractAssistantText({
      id: "test",
      created: 0,
      model: "gpt-5-mini",
      choices: [{
        index: 0,
        message: { role: "assistant", content: "" },
        finish_reason: null,
      }],
    });

    expect(result).toBeNull();
  });
});
