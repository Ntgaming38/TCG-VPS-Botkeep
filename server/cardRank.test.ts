import { describe, expect, it } from "vitest";
import { getCardRankLabel, normalizeCardRank } from "../shared/cardRank";

describe("card rank", () => {
  it("nhận Rank A đến D hợp lệ", () => {
    expect(normalizeCardRank("A")).toBe("A");
    expect(normalizeCardRank("rank b")).toBe("B");
    expect(normalizeCardRank(" C ")).toBe("C");
    expect(normalizeCardRank("D")).toBe("D");
  });

  it("đưa dữ liệu Condition cũ về Rank A an toàn", () => {
    expect(normalizeCardRank("New")).toBe("A");
    expect(normalizeCardRank(null)).toBe("A");
    expect(getCardRankLabel("B")).toBe("Rank B");
  });
});
