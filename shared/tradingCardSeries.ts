export const TRADING_CARD_SERIES = ["Pokemon", "One Piece", "Dragon Ball", "Yu-Gi-Oh!", "Other"] as const;

export type TradingCardSeries = (typeof TRADING_CARD_SERIES)[number];

export function tradingCardSeriesLabel(series: TradingCardSeries) {
  if (series === "Pokemon") return "Pokémon";
  if (series === "Other") return "Khác";
  return series;
}
