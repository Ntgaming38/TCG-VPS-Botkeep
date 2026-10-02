export const DEFAULT_CHYUSEN_SHOPS = [
  "Geo",
  "Joshin",
  "Fruichi",
  "COMG!",
  "Toysrus",
  "Family Mart",
  "Bandai Premium",
  "Pokémon Center",
  "Rakuten",
] as const;

export const ADD_CUSTOM_CHYUSEN_SHOP_VALUE = "Thêm cửa hàng";
export const CUSTOM_CHYUSEN_SHOP_PREFIX = "__custom_chyusen_shop__:";

export function customChyusenShopOptionValue(name: string) {
  return `${CUSTOM_CHYUSEN_SHOP_PREFIX}${encodeURIComponent(name)}`;
}

export function parseCustomChyusenShopOptionValue(value: string) {
  if (!value.startsWith(CUSTOM_CHYUSEN_SHOP_PREFIX)) return null;
  try {
    return decodeURIComponent(value.slice(CUSTOM_CHYUSEN_SHOP_PREFIX.length)).trim() || null;
  } catch {
    return null;
  }
}

export function isDefaultChyusenShop(name: string) {
  return DEFAULT_CHYUSEN_SHOPS.includes(name as typeof DEFAULT_CHYUSEN_SHOPS[number]);
}
