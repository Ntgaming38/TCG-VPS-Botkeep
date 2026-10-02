export const CARD_RANKS = ["A", "B", "C", "D"] as const;
export type CardRank = (typeof CARD_RANKS)[number];

export function normalizeCardRank(value?: string | null): CardRank {
  const normalized = String(value || "").trim().replace(/^rank\s*/i, "").toUpperCase();
  return CARD_RANKS.includes(normalized as CardRank) ? normalized as CardRank : "A";
}

export function getCardRankLabel(value?: string | null): string {
  return `Rank ${normalizeCardRank(value)}`;
}
