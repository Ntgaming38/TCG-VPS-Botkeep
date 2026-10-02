export function normalizeChyusenQrUrl(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value.trim();
  try {
    const url = new URL(normalized);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

const CHYUSEN_SHOP_HOSTS: Array<{ shop: string; hosts: string[] }> = [
  { shop: "Fruichi", hosts: ["furu1.net", "furu1online.net", "furuichi.com"] },
  { shop: "Geo", hosts: ["geo-online.co.jp", "geo-mobile.jp"] },
  { shop: "Joshin", hosts: ["joshinweb.jp", "joshin.co.jp"] },
  { shop: "Toysrus", hosts: ["toysrus.co.jp"] },
  { shop: "Family Mart", hosts: ["family.co.jp", "famima.com"] },
  { shop: "Bandai Premium", hosts: ["p-bandai.jp", "bandai.co.jp"] },
  { shop: "Pokémon Center", hosts: ["pokemoncenter-online.com", "pokemon.co.jp"] },
  { shop: "Rakuten", hosts: ["rakuten.co.jp", "rakuten.ne.jp"] },
];

export function detectChyusenShopFromUrl(value: string | null | undefined) {
  const normalized = normalizeChyusenQrUrl(value);
  if (!normalized) return null;
  const hostname = new URL(normalized).hostname.toLowerCase().replace(/^www\./, "");
  return CHYUSEN_SHOP_HOSTS.find(({ hosts }) => hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`)))?.shop ?? null;
}

export const detectChyusenShopFromQrUrl = detectChyusenShopFromUrl;
