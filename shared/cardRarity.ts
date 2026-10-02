/** Thứ tự ưu tiên dùng cho Card từ mọi series: độ hiếm cao nhất đứng trước. */
export const CARD_RARITY_ORDER = [
  "FUR",
  "MUR",
  "SAR",
  "SR",
  "AR",
  "RR",
  "R",
  "ONEPICE",
  "Promo",
  "Khác",
] as const;

export const POKEMON_CARD_RARITY_ORDER = CARD_RARITY_ORDER;
export const ONE_PIECE_CARD_RARITY_ORDER = CARD_RARITY_ORDER;

export const CARD_RARITY_OPTIONS = CARD_RARITY_ORDER.map((value) => ({ value, label: value }));

export function getCardRarityOptionsForSeries(series?: string | null) {
  void series;
  return CARD_RARITY_OPTIONS;
}

/** Chuẩn hóa nhãn lịch sử về taxonomy gọn dùng trong toàn bộ ứng dụng. */
export function normalizeCardRarity(rarity?: string | null): string {
  if (rarity === "UR") return "MUR";
  if (["Onepice", "One Piece", "Manga", "SEC", "SP", "L", "UC", "C"].includes(rarity || "")) return "ONEPICE";
  if (["Rare", "Uncommon", "Common"].includes(rarity || "")) return "Khác";
  return rarity || "";
}

export function getCardRarityPriority(rarity?: string | null): number {
  const normalized = normalizeCardRarity(rarity);
  const index = CARD_RARITY_ORDER.indexOf(normalized as (typeof CARD_RARITY_ORDER)[number]);
  return index === -1 ? CARD_RARITY_ORDER.length : index;
}

export type CardRarityQuantity = {
  rarity: string;
  quantity: number;
};

export function summarizeCardRarityQuantities(cards: Array<{ rarity?: string | null; quantity?: number | null }>): CardRarityQuantity[] {
  const totals = new Map<string, number>();

  for (const card of cards) {
    const rarity = normalizeCardRarity(card.rarity) || "Chưa phân loại";
    const quantity = Number(card.quantity || 0);
    if (quantity > 0) totals.set(rarity, (totals.get(rarity) || 0) + quantity);
  }

  return Array.from(totals, ([rarity, quantity]) => ({ rarity, quantity }))
    .sort((a, b) => getCardRarityPriority(a.rarity) - getCardRarityPriority(b.rarity) || a.rarity.localeCompare(b.rarity));
}
