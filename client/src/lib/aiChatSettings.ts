/** Cờ bật/tắt Trợ lý AI theo thiết bị (lưu localStorage, mặc định bật). */
export const AI_CHAT_ENABLED_KEY = "tcg-ai-chat-enabled";
export const AI_CHAT_SETTINGS_EVENT = "tcg-ai-chat-settings-changed";

export function getAiChatEnabled(): boolean {
  try {
    return localStorage.getItem(AI_CHAT_ENABLED_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setAiChatEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(AI_CHAT_ENABLED_KEY, enabled ? "1" : "0");
  } catch {
    // Bỏ qua lỗi lưu trữ (chế độ riêng tư); sự kiện bên dưới vẫn phát.
  }
  window.dispatchEvent(new Event(AI_CHAT_SETTINGS_EVENT));
}
