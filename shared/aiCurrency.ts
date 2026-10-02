export function normalizeAiCurrencyToYen(content: string) {
  return content
    .replace(/(-?)([\d][\d.,]*)\s*(?:VNĐ|VND)/gi, (_match, sign, amount) => `${sign ? "- " : ""}${amount} ¥`)
    .replace(/\b(?:VNĐ|VND)\b/gi, "¥");
}
