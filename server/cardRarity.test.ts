import { describe, expect, it } from "vitest";
import {
  CARD_RARITY_ORDER,
  CARD_RARITY_OPTIONS,
  getCardRarityOptionsForSeries,
  getCardRarityPriority,
  normalizeCardRarity,
  summarizeCardRarityQuantities,
} from "../shared/cardRarity";

describe("CARD_RARITY_OPTIONS", () => {
  it("chỉ có các lựa chọn độ hiếm chuẩn theo đúng thứ tự", () => {
    const values = CARD_RARITY_OPTIONS.map((option) => option.value);

    expect(values).toEqual(["FUR", "MUR", "SAR", "SR", "AR", "RR", "R", "ONEPICE", "Promo", "Khác"]);
    expect(CARD_RARITY_ORDER).toEqual(values);
  });

  it("trả cùng taxonomy gọn cho Pokémon và One Piece", () => {
    const pokemonValues = getCardRarityOptionsForSeries("Pokemon").map((option) => option.value);
    const onePieceValues = getCardRarityOptionsForSeries("One Piece").map((option) => option.value);

    expect(pokemonValues).toEqual(CARD_RARITY_ORDER);
    expect(onePieceValues).toEqual(CARD_RARITY_ORDER);
  });

  it("chuẩn hóa nhãn legacy theo taxonomy mới", () => {
    expect(normalizeCardRarity("UR")).toBe("MUR");
    expect(normalizeCardRarity("Onepice")).toBe("ONEPICE");
    expect(normalizeCardRarity("Manga")).toBe("ONEPICE");
    expect(normalizeCardRarity("Common")).toBe("Khác");
    expect(normalizeCardRarity("SAR")).toBe("SAR");
    expect(normalizeCardRarity(null)).toBe("");
  });

  it("xếp FUR, MUR, SAR, SR, AR, RR, R, ONEPICE, Promo rồi Khác", () => {
    expect(getCardRarityPriority("FUR")).toBeLessThan(getCardRarityPriority("MUR"));
    expect(getCardRarityPriority("MUR")).toBeLessThan(getCardRarityPriority("SAR"));
    expect(getCardRarityPriority("SAR")).toBeLessThan(getCardRarityPriority("SR"));
    expect(getCardRarityPriority("SR")).toBeLessThan(getCardRarityPriority("AR"));
    expect(getCardRarityPriority("SAR")).toBeLessThan(getCardRarityPriority("AR"));
    expect(getCardRarityPriority("AR")).toBeLessThan(getCardRarityPriority("RR"));
    expect(getCardRarityPriority("RR")).toBeLessThan(getCardRarityPriority("R"));
    expect(getCardRarityPriority("R")).toBeLessThan(getCardRarityPriority("ONEPICE"));
    expect(getCardRarityPriority("ONEPICE")).toBeLessThan(getCardRarityPriority("Promo"));
    expect(getCardRarityPriority("Promo")).toBeLessThan(getCardRarityPriority("Khác"));
  });

  it("tổng hợp số lượng Card theo thứ tự chuẩn mới", () => {
    const result = summarizeCardRarityQuantities([
      { rarity: "R", quantity: 2 },
      { rarity: "UR", quantity: 1 },
      { rarity: "FUR", quantity: 2 },
      { rarity: "One Piece", quantity: 2 },
      { rarity: "Promo", quantity: 1 },
      { rarity: "Common", quantity: 1 },
      { rarity: "RR", quantity: 3 },
      { rarity: "SAR", quantity: 4 },
      { rarity: "", quantity: 1 },
    ]);

    expect(result).toEqual([
      { rarity: "FUR", quantity: 2 },
      { rarity: "MUR", quantity: 1 },
      { rarity: "SAR", quantity: 4 },
      { rarity: "RR", quantity: 3 },
      { rarity: "R", quantity: 2 },
      { rarity: "ONEPICE", quantity: 2 },
      { rarity: "Promo", quantity: 1 },
      { rarity: "Khác", quantity: 1 },
      { rarity: "Chưa phân loại", quantity: 1 },
    ]);
  });
});
