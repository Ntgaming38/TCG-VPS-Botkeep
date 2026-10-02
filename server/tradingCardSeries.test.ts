import { describe, expect, it } from "vitest";
import { TRADING_CARD_SERIES, tradingCardSeriesLabel } from "../shared/tradingCardSeries";

describe("trading card series", () => {
  it("includes Dragon Ball and Yu-Gi-Oh! in the shared selectable series", () => {
    expect(TRADING_CARD_SERIES).toContain("Dragon Ball");
    expect(TRADING_CARD_SERIES).toContain("Yu-Gi-Oh!");
    expect(tradingCardSeriesLabel("Dragon Ball")).toBe("Dragon Ball");
    expect(tradingCardSeriesLabel("Yu-Gi-Oh!")).toBe("Yu-Gi-Oh!");
  });
});
