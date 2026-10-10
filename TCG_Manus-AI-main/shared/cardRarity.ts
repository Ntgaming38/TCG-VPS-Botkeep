export const POKEMON_CARD_RARITY_ORDER = [
  "MUR",
  "SAR",
  "AR",
  "RR",
  "R",
  "SR",
  "Promo",
  "Rare",
  "Uncommon",
  "Common",
] as const;

export const ONE_PIECE_CARD_RARITY_ORDER = [
  "One Piece",
  "Manga",
  "SEC",
  "SP",
  "L",
  "SR",
  "R",
  "UC",
  "C",
] as const;

/** Thứ tự ưu tiên dùng cho Card từ mọi series: độ hiếm cao nhất đứng trước. */
export const CARD_RARITY_ORDER = [
  "MUR",
  "One Piece",
  "Manga",
  "SAR",
  "SEC",
  "SP",
  "L",
  "AR",
  "RR",
  "R",
  "SR",
  "Promo",
  "Rare",
  "Uncommon",
  "Common",
  "UC",
  "C",
] as const;

export const CARD_RARITY_OPTIONS = CARD_RARITY_ORDER.map((value) => ({ value, label: value }));

export function getCardRarityOptionsForSeries(series?: string | null) {
  const values = series === "One Piece" ? ONE_PIECE_CARD_RARITY_ORDER : POKEMON_CARD_RARITY_ORDER;
  return values.map((value) => ({ value, label: value }));
}

/** Giữ các Card UR cũ hiển thị theo nhãn MUR mới mà không buộc thay đổi dữ liệu lịch sử. */
export function normalizeCardRarity(rarity?: string | null): string {
  if (rarity === "UR") return "MUR";
  if (rarity === "Onepice") return "One Piece";
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
