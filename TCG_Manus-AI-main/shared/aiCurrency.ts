export function normalizeAiCurrencyToYen(content: string) {
  return content
    .replace(/(-?[\d][\d.,]*)\s*(?:VNĐ|VND)/gi, "¥$1")
    .replace(/\b(?:VNĐ|VND)\b/gi, "¥");
}
