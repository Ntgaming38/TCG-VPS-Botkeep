import type { InvokeResult, TextContent } from "./_core/llm";

/**
 * Trích xuất nội dung văn bản có thể hiển thị từ phản hồi LLM.
 * Một số mô hình trả content dưới dạng mảng content parts thay vì chuỗi.
 */
export function extractAssistantText(response: InvokeResult): string | null {
  const content = response.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    const trimmed = content.trim();
    return trimmed || null;
  }

  if (Array.isArray(content)) {
    const text = content
      .filter((part): part is TextContent => part.type === "text")
      .map((part) => part.text.trim())
      .filter(Boolean)
      .join("\n")
      .trim();
    return text || null;
  }

  return null;
}
