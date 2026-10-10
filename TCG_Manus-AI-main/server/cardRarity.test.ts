import { describe, expect, it } from "vitest";
import {
  CARD_RARITY_OPTIONS,
  getCardRarityOptionsForSeries,
  getCardRarityPriority,
  normalizeCardRarity,
  summarizeCardRarityQuantities,
} from "../shared/cardRarity";

describe("CARD_RARITY_OPTIONS", () => {
  it("có MUR và không còn UR trong danh sách lựa chọn mới", () => {
    const values = CARD_RARITY_OPTIONS.map((option) => option.value);

    expect(values).toContain("MUR");
    expect(values).toContain("One Piece");
    expect(values).toContain("RR");
    expect(values).toContain("R");
    expect(values).not.toContain("UR");
  });

  it("trả danh sách rarity riêng cho Pokémon và One Piece", () => {
    const pokemonValues = getCardRarityOptionsForSeries("Pokemon").map((option) => option.value);
    const onePieceValues = getCardRarityOptionsForSeries("One Piece").map((option) => option.value);

    expect(pokemonValues).toEqual(expect.arrayContaining(["MUR", "SAR", "AR", "RR", "R"]));
    expect(pokemonValues).not.toContain("SEC");
    expect(onePieceValues).toEqual(expect.arrayContaining(["One Piece", "Manga", "SEC", "SP", "L", "SR", "R", "UC", "C"]));
    expect(onePieceValues).not.toContain("MUR");
    expect(onePieceValues).not.toContain("AR");
    expect(onePieceValues).not.toContain("RR");
  });

  it("hiển thị Card UR cũ bằng nhãn MUR mới", () => {
    expect(normalizeCardRarity("UR")).toBe("MUR");
    expect(normalizeCardRarity("Onepice")).toBe("One Piece");
    expect(normalizeCardRarity("SAR")).toBe("SAR");
    expect(normalizeCardRarity(null)).toBe("");
  });

  it("xếp MUR, SAR, AR, RR rồi R theo đúng độ hiếm", () => {
    expect(getCardRarityPriority("MUR")).toBeLessThan(getCardRarityPriority("SAR"));
    expect(getCardRarityPriority("MUR")).toBeLessThan(getCardRarityPriority("One Piece"));
    expect(getCardRarityPriority("One Piece")).toBeLessThan(getCardRarityPriority("SAR"));
    expect(getCardRarityPriority("SAR")).toBeLessThan(getCardRarityPriority("AR"));
    expect(getCardRarityPriority("AR")).toBeLessThan(getCardRarityPriority("RR"));
    expect(getCardRarityPriority("RR")).toBeLessThan(getCardRarityPriority("R"));
  });

  it("tổng hợp số lượng Card theo rarity với UR cũ được tính là MUR", () => {
    const result = summarizeCardRarityQuantities([
      { rarity: "R", quantity: 2 },
      { rarity: "UR", quantity: 1 },
      { rarity: "One Piece", quantity: 2 },
      { rarity: "RR", quantity: 3 },
      { rarity: "SAR", quantity: 4 },
      { rarity: "", quantity: 1 },
    ]);

    expect(result).toEqual([
      { rarity: "MUR", quantity: 1 },
      { rarity: "One Piece", quantity: 2 },
      { rarity: "SAR", quantity: 4 },
      { rarity: "RR", quantity: 3 },
      { rarity: "R", quantity: 2 },
      { rarity: "Chưa phân loại", quantity: 1 },
    ]);
  });
});
