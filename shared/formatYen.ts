export const CURRENCY_SYMBOL_POSITION_STORAGE_KEY = "tcg-currency-symbol-position";
export const CURRENCY_SYMBOL_POSITIONS = ["suffix", "prefix"] as const;
export type CurrencySymbolPosition = (typeof CURRENCY_SYMBOL_POSITIONS)[number];
export const DEFAULT_CURRENCY_SYMBOL_POSITION: CurrencySymbolPosition = "suffix";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function parseCurrencySymbolPosition(value: unknown): CurrencySymbolPosition {
  return CURRENCY_SYMBOL_POSITIONS.includes(value as CurrencySymbolPosition)
    ? value as CurrencySymbolPosition
    : DEFAULT_CURRENCY_SYMBOL_POSITION;
}

export function readCurrencySymbolPosition(storage?: StorageLike): CurrencySymbolPosition {
  return parseCurrencySymbolPosition(storage?.getItem(CURRENCY_SYMBOL_POSITION_STORAGE_KEY));
}

export function saveCurrencySymbolPosition(position: CurrencySymbolPosition, storage?: StorageLike) {
  storage?.setItem(CURRENCY_SYMBOL_POSITION_STORAGE_KEY, position);
}

function getCurrentCurrencySymbolPosition() {
  if (typeof window === "undefined") return DEFAULT_CURRENCY_SYMBOL_POSITION;
  return readCurrencySymbolPosition(window.localStorage);
}

export function formatYen(value: number, locale = "ja-JP", position = getCurrentCurrencySymbolPosition()): string {
  const normalizedValue = Number.isFinite(value) ? value : 0;
  const amount = Math.abs(normalizedValue).toLocaleString(locale);
  if (position === "prefix") return `¥ ${normalizedValue < 0 ? "-" : ""}${amount}`;
  return `${normalizedValue < 0 ? "- " : ""}${amount} ¥`;
}

export function formatSignedYen(value: number, locale = "ja-JP", position = getCurrentCurrencySymbolPosition()): string {
  return `${value > 0 ? position === "prefix" ? "+" : "+ " : ""}${formatYen(value, locale, position)}`;
}
