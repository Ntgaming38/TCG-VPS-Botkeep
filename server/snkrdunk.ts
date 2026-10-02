const SNKRDUNK_HOSTS = new Set(["snkrdunk.com", "www.snkrdunk.com"]);
export const SNKRDUNK_FETCH_TIMEOUT_MS = 8_000;

export class SnkrdunkSyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SnkrdunkSyncError";
  }
}

export type SnkrdunkPriceResult = {
  price: number;
  sourceUrl: string;
};

/** A public JPY offer for a quantity/variant. No currency conversion is ever applied. */
export type SnkrdunkQuantityPrice = {
  quantity: number | null;
  label: string;
  price: number;
  listingCount: number | null;
};

export type SnkrdunkProductMetadata = {
  title: string | null;
  imageUrl: string | null;
};

export type SnkrdunkProductType = "card" | "box" | "pack";

type SnkrdunkSize = {
  currency?: unknown;
  price?: unknown;
  priceFormat?: unknown;
  size?: {
    text?: unknown;
    productSizeId?: unknown;
  };
};

type SnkrdunkSizesResponse = {
  sizes?: unknown;
};

export function isValidSnkrdunkUrl(sourceUrl: string): boolean {
  try {
    const url = new URL(sourceUrl);
    const pathname = url.pathname.replace(/\/+$/, "");
    return (
      url.protocol === "https:" &&
      SNKRDUNK_HOSTS.has(url.hostname.toLowerCase()) &&
      pathname.length > 1 &&
      !pathname.startsWith("/categories/")
    );
  } catch {
    return false;
  }
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&yen;|&#165;|&#xA5;/gi, "¥")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#45;/gi, "-")
    .replace(/&#x2D;/gi, "-")
    .replace(/&amp;/gi, "&");
}

function findMetaContent(html: string, key: string): string | null {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escapedKey}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escapedKey}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtmlEntities(match[1]).trim();
  }
  return null;
}

function normalizeProductImageUrl(value: string | null): string | null {
  if (!value) return null;
  const trimmed = decodeHtmlEntities(value).trim();
  if (!trimmed || trimmed.startsWith("data:")) return null;
  const candidate = trimmed.startsWith("//") ? `https:${trimmed}` : trimmed.startsWith("/") ? `https://snkrdunk.com${trimmed}` : trimmed;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:") return null;
    // This social banner is not a photo of the selected card, box, or pack.
    if (isSnkrdunkGenericImageUrl(url.toString())) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function isSnkrdunkGenericImageUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.hostname.toLowerCase() === "cdn.snkrdunk.com"
      && /\/images\/ogp\/og-image\.png$/i.test(url.pathname);
  } catch {
    return false;
  }
}

function findStructuredProductImage(html: string): string | null {
  const jsonLdMatch = html.match(/"image"\s*:\s*(?:"([^"]+)"|\[\s*"([^"]+)")/i);
  if (jsonLdMatch?.[1] || jsonLdMatch?.[2]) return jsonLdMatch[1] ?? jsonLdMatch[2];

  const imageTags = html.match(/<img\b[^>]*>/gi) ?? [];
  for (const tag of imageTags) {
    const source = tag.match(/\b(?:data-src|data-original|src)=["']([^"']+)["']/i)?.[1];
    if (!source || /(?:logo|icon|avatar|placeholder|blank)/i.test(source)) continue;
    return source;
  }
  return null;
}

/** Extracts public display metadata only; it never invents a product image or title. */
export function parseSnkrdunkProductMetadata(html: string): SnkrdunkProductMetadata {
  const decoded = decodeHtmlEntities(html);
  const rawTitle = findMetaContent(decoded, "og:title")
    ?? findMetaContent(decoded, "twitter:title")
    ?? decoded.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, " ").trim()
    ?? null;
  const title = rawTitle?.replace(/\s*[|｜]\s*SNKRDUNK\s*$/i, "").replace(/\s+/g, " ").trim() || null;
  const imageUrl = [
    findMetaContent(decoded, "og:image"),
    findMetaContent(decoded, "twitter:image"),
    findStructuredProductImage(decoded),
  ].map(normalizeProductImageUrl).find((image): image is string => Boolean(image)) ?? null;
  return { title, imageUrl };
}

function findJsonStringField(payload: string, key: string): string | null {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = payload.match(new RegExp(`"${escapedKey}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, "i"));
  if (!match?.[1]) return null;
  try {
    return JSON.parse(`"${match[1]}"`) as string;
  } catch {
    return decodeHtmlEntities(match[1]).trim() || null;
  }
}

/** Parses the public product-detail response, including partial JSON from slow upstream connections. */
export function parseSnkrdunkProductApiMetadata(payload: string): SnkrdunkProductMetadata {
  const productStart = payload.search(/"product"\s*:/i);
  const productPayload = productStart >= 0 ? payload.slice(productStart, productStart + 8_000) : payload;
  const title = findJsonStringField(productPayload, "name");
  const imageUrl = [
    findJsonStringField(productPayload, "thumbnailUrl"),
    findJsonStringField(productPayload, "imageUrl"),
    findJsonStringField(productPayload, "primaryImageUrl"),
  ].map(normalizeProductImageUrl).find((image): image is string => Boolean(image)) ?? null;
  return { title, imageUrl };
}

function parseJpyNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
  }
  if (typeof value !== "string") return null;
  const normalized = decodeHtmlEntities(value).replace(/[,\s円¥]/g, "");
  const match = normalized.match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const number = Number(match[0]);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : null;
}

function isJpyCurrency(value: unknown): boolean {
  if (value === undefined || value === null || value === "") return false;
  const currency = String(value).trim().toUpperCase();
  return currency === "JPY" || currency === "¥" || currency === "円";
}

function findFirstJsonPrice(value: unknown, inheritedCurrency?: string): number | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const price = findFirstJsonPrice(item, inheritedCurrency);
      if (price !== null) return price;
    }
    return null;
  }

  const objectValue = value as Record<string, unknown>;
  const localCurrency = objectValue.priceCurrency ?? objectValue.currency;
  const currency = String(localCurrency ?? inheritedCurrency ?? "").toUpperCase();
  const isJpy = !currency || isJpyCurrency(currency);

  for (const [key, nestedValue] of Object.entries(objectValue)) {
    const normalizedKey = key.toLowerCase();
    if (isJpy && ["lowestprice", "lowprice", "minprice", "price"].includes(normalizedKey)) {
      const price = parseJpyNumber(nestedValue);
      if (price !== null) return price;
    }
    const nestedPrice = findFirstJsonPrice(nestedValue, currency || inheritedCurrency);
    if (nestedPrice !== null) return nestedPrice;
  }
  return null;
}

function findFirstScriptJsonPrice(html: string): number | null {
  const scriptPattern = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = scriptPattern.exec(html)) !== null) {
    const content = decodeHtmlEntities(match[1].trim());
    if (!content) continue;
    try {
      const price = findFirstJsonPrice(JSON.parse(content));
      if (price !== null) return price;
    } catch {
      const currencyMatch = content.match(/["'](?:priceCurrency|currency)["']\s*:\s*["']?([A-Za-z¥円]+)/i);
      const currency = currencyMatch?.[1]?.toUpperCase();
      const isJpy = !currency || isJpyCurrency(currency);
      if (!isJpy) continue;
      const priceMatch = content.match(/["'](?:lowestPrice|lowPrice|minPrice|price)["']\s*:\s*["']?([\d,]+(?:\.\d+)?)/i);
      const price = priceMatch ? parseJpyNumber(priceMatch[1]) : null;
      if (price !== null) return price;
    }
  }
  return null;
}

function parseFirstChoiceListingStatePrice(html: string): number | null {
  const firstQuantityPattern = /quantity_1(?:\\")?[^\n]{0,240}?minNewListingPrice(?:\\")?\s*:\s*(\d[\d,]*)/i;
  const firstQuantityMatch = html.match(firstQuantityPattern);
  if (firstQuantityMatch) return parseJpyNumber(firstQuantityMatch[1]);

  const firstPriceMatch = html.match(/minNewListingPrice(?:\\")?\s*:\s*(\d[\d,]*)/i);
  return firstPriceMatch ? parseJpyNumber(firstPriceMatch[1]) : null;
}

export function parseCardRankPrice(html: string, rank: CardRank = "A"): number | null {
  const decoded = decodeHtmlEntities(html);
  const buttons = decoded.match(/<button\b[^>]*>[\s\S]*?<\/button>/gi) ?? [];
  for (const button of buttons) {
    const escapedRank = rank.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rankPattern = new RegExp(`(?:>\\s*${escapedRank}(?:あり)?\\s*<|>\\s*${escapedRank}\\s*<)`, "i");
    if (!rankPattern.test(button)) continue;
    const priceMatch = button.match(/(?:¥|円)(?:<[^>]+>)*\s*([\d,]+)/i);
    const price = priceMatch ? parseJpyNumber(priceMatch[1]) : null;
    if (price !== null) return price;
  }

  const fallbackMatch = decoded.match(new RegExp(`(?:${rank}あり|>\\s*${rank}\\s*<)[\\s\\S]{0,500}?(?:¥|円)(?:<[^>]+>)*\\s*([\\d,]+)`, "i"));
  return fallbackMatch ? parseJpyNumber(fallbackMatch[1]) : null;
}

/** Backwards-compatible convenience parser for current Rank A behavior. */
export function parseFirstRankAPrice(html: string): number | null {
  return parseCardRankPrice(html, "A");
}

function parseFirstChoiceMarkupPrice(html: string): number | null {
  const decoded = decodeHtmlEntities(html);
  const firstChoicePatterns = [
    /1個\s*\(\s*99\+\s*\)[\s\S]{0,180}?¥\s*([\d,]+)/i,
    /1個\s*[\s\S]{0,180}?¥\s*([\d,]+)/i,
    /1\s*(?:個|item)\s*[\s\S]{0,180}?(?:¥|円)\s*([\d,]+)/i,
  ];

  for (const pattern of firstChoicePatterns) {
    const match = decoded.match(pattern);
    const price = match ? parseJpyNumber(match[1]) : null;
    if (price !== null) return price;
  }
  return null;
}

export function parseSnkrdunkPrice(html: string): number | null {
  return (
    findFirstScriptJsonPrice(html) ??
    parseFirstChoiceListingStatePrice(html) ??
    parseFirstChoiceMarkupPrice(html)
  );
}

/** Reads the public JPY quantity choices rendered in a product page. */
export function parseSnkrdunkQuantityPrices(html: string, productType: SnkrdunkProductType = "box"): SnkrdunkQuantityPrice[] {
  const decoded = decodeHtmlEntities(html);
  const byQuantity = new Map<number, SnkrdunkQuantityPrice>();
  const typeLabel = productType === "card" ? "Card" : productType === "pack" ? "Pack" : "Box";

  const listingStatePattern = /quantity_(\d+)(?:\\?")?[\s\S]{0,260}?minNewListingPrice(?:\\?")?\s*:\s*"?(\d[\d,]*)/gi;
  let listingMatch: RegExpExecArray | null;
  while ((listingMatch = listingStatePattern.exec(decoded)) !== null) {
    const quantity = Number(listingMatch[1]);
    const price = parseJpyNumber(listingMatch[2]);
    if (Number.isInteger(quantity) && quantity > 0 && quantity <= 10 && price !== null) {
      byQuantity.set(quantity, { quantity, label: `${quantity} ${typeLabel}`, price, listingCount: null });
    }
  }

  const markupPattern = /(?:^|>)\s*(\d+)\s*(?:個|boxes?|packs?|items?|cards?)[\s\S]{0,180}?(?:¥|円)\s*([\d,]+)/gi;
  let markupMatch: RegExpExecArray | null;
  while ((markupMatch = markupPattern.exec(decoded)) !== null) {
    const quantity = Number(markupMatch[1]);
    const price = parseJpyNumber(markupMatch[2]);
    if (Number.isInteger(quantity) && quantity > 0 && quantity <= 10 && price !== null && !byQuantity.has(quantity)) {
      byQuantity.set(quantity, { quantity, label: `${quantity} ${typeLabel}`, price, listingCount: null });
    }
  }

  return Array.from(byQuantity.values()).sort((left, right) => (left.quantity ?? 99) - (right.quantity ?? 99));
}

function extractProductCode(sourceUrl: string, html: string): string | null {
  const decoded = decodeHtmlEntities(html);
  const productCodeMatch = decoded.match(/"productCode"\s*:\s*"([A-Za-z0-9_-]+)"/i);
  if (productCodeMatch?.[1]) return productCodeMatch[1];

  const pathMatch = new URL(sourceUrl).pathname.match(/\/(?:trading-cards|streetwears|sneakers)\/(\d+)(?:\/|$)/i);
  return pathMatch?.[1] ? `SW---${pathMatch[1]}` : null;
}

function isSnkrdunkSize(value: unknown): value is SnkrdunkSize {
  return Boolean(value && typeof value === "object");
}

function getNumericProductId(sourceUrl: string): string | null {
  const pathname = new URL(sourceUrl).pathname;
  const match = pathname.match(/\/(?:trading-cards|streetwears|sneakers|apparels)\/(\d+)(?:\/|$)/i);
  return match?.[1] ?? null;
}

function getProductCodeFromUrl(sourceUrl: string): string | null {
  const productId = getNumericProductId(sourceUrl);
  return productId ? `SW---${productId}` : null;
}

function getJapaneseProductFallbackUrl(sourceUrl: string): string | null {
  const productId = getNumericProductId(sourceUrl);
  if (!productId) return null;
  const fallbackUrl = `https://snkrdunk.com/apparels/${productId}`;
  return fallbackUrl === sourceUrl ? null : fallbackUrl;
}

async function fetchPublicHtml(sourceUrl: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch(sourceUrl, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ja-JP,ja;q=0.9,en;q=0.8",
        "User-Agent": "Mozilla/5.0 (compatible; TCGManager/1.0; +https://snkrdunk.com)",
      },
      signal: AbortSignal.timeout(SNKRDUNK_FETCH_TIMEOUT_MS),
    });
  } catch {
    throw new SnkrdunkSyncError("Không thể truy cập trang sản phẩm SNKRDUNK.");
  }

  if (!response.ok) {
    throw new SnkrdunkSyncError(`SNKRDUNK trả về lỗi HTTP ${response.status}.`);
  }
  return response.text();
}

async function fetchPublicProductMetadata(productCode: string): Promise<SnkrdunkProductMetadata> {
  const endpoint = `https://snkrdunk.com/en/v1/products/${encodeURIComponent(productCode)}`;
  let response: Response;
  try {
    response = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "ja-JP,ja;q=0.9,en;q=0.8",
        "User-Agent": "Mozilla/5.0 (compatible; TCGManager/1.0; +https://snkrdunk.com)",
      },
      signal: AbortSignal.timeout(SNKRDUNK_FETCH_TIMEOUT_MS),
    });
  } catch {
    throw new SnkrdunkSyncError("Không thể truy cập metadata sản phẩm SNKRDUNK.");
  }
  if (!response.ok) throw new SnkrdunkSyncError(`SNKRDUNK metadata trả về lỗi HTTP ${response.status}.`);
  return parseSnkrdunkProductApiMetadata(await response.text());
}

export async function fetchSnkrdunkProductMetadata(sourceUrl: string): Promise<SnkrdunkProductMetadata> {
  if (!isValidSnkrdunkUrl(sourceUrl)) {
    throw new SnkrdunkSyncError("Link phải là trang sản phẩm https://snkrdunk.com, không phải link danh mục.");
  }
  const html = await fetchPublicHtml(sourceUrl);
  const pageMetadata = parseSnkrdunkProductMetadata(html);
  const productCode = extractProductCode(sourceUrl, html) ?? getProductCodeFromUrl(sourceUrl);
  if (!productCode) return pageMetadata;
  try {
    const apiMetadata = await fetchPublicProductMetadata(productCode);
    return {
      title: apiMetadata.title ?? pageMetadata.title,
      imageUrl: apiMetadata.imageUrl ?? pageMetadata.imageUrl,
    };
  } catch {
    // Public page metadata remains a safe fallback when the detail endpoint is unavailable.
    return pageMetadata;
  }
}

async function fetchFirstSizePrice(productCode: string): Promise<number> {
  const endpoint = `https://snkrdunk.com/en/v1/products/${encodeURIComponent(productCode)}/sizes?currency=JPY`;
  let response: Response;
  try {
    response = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "ja-JP,ja;q=0.9,en;q=0.8",
        "User-Agent": "Mozilla/5.0 (compatible; TCGManager/1.0; +https://snkrdunk.com)",
      },
      signal: AbortSignal.timeout(SNKRDUNK_FETCH_TIMEOUT_MS),
    });
  } catch {
    throw new SnkrdunkSyncError("Không thể truy cập API giá SNKRDUNK.");
  }

  if (!response.ok) {
    throw new SnkrdunkSyncError(`SNKRDUNK API trả về lỗi HTTP ${response.status}.`);
  }

  let payload: SnkrdunkSizesResponse;
  try {
    payload = (await response.json()) as SnkrdunkSizesResponse;
  } catch {
    throw new SnkrdunkSyncError("SNKRDUNK API trả về dữ liệu không hợp lệ.");
  }

  const sizes = Array.isArray(payload.sizes) ? payload.sizes.filter(isSnkrdunkSize) : [];
  const firstSize = sizes[0];
  if (!firstSize) {
    throw new SnkrdunkSyncError("SNKRDUNK không có lựa chọn sản phẩm công khai.");
  }

  if (!isJpyCurrency(firstSize.currency)) {
    const currency = firstSize.currency ? String(firstSize.currency) : "ngoại tệ";
    throw new SnkrdunkSyncError(
      `SNKRDUNK đang trả giá lựa chọn đầu tiên bằng ${currency}, chưa có giá JPY công khai để cập nhật an toàn.`,
    );
  }

  const price = parseJpyNumber(firstSize.price ?? firstSize.priceFormat);
  if (price === null) {
    throw new SnkrdunkSyncError(
      "Không tìm thấy giá JPY của lựa chọn đầu tiên trên SNKRDUNK. Giá chưa được cập nhật.",
    );
  }

  return price;
}

async function fetchJpySizePrices(productCode: string, productType: SnkrdunkProductType, cardRank: CardRank): Promise<SnkrdunkQuantityPrice[]> {
  const endpoint = `https://snkrdunk.com/en/v1/products/${encodeURIComponent(productCode)}/sizes?currency=JPY`;
  let response: Response;
  try {
    response = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "ja-JP,ja;q=0.9,en;q=0.8",
        "User-Agent": "Mozilla/5.0 (compatible; TCGManager/1.0; +https://snkrdunk.com)",
      },
      signal: AbortSignal.timeout(SNKRDUNK_FETCH_TIMEOUT_MS),
    });
  } catch {
    return [];
  }
  if (!response.ok) return [];

  let payload: SnkrdunkSizesResponse;
  try {
    payload = (await response.json()) as SnkrdunkSizesResponse;
  } catch {
    return [];
  }

  const sizes = Array.isArray(payload.sizes) ? payload.sizes.filter(isSnkrdunkSize) : [];
  const rankOptions = sizes.filter((size) => new RegExp(`(^|[^A-Z])${cardRank}(?:あり)?($|[^A-Z])`, "i").test(String(size.size?.text ?? "")));
  const sourceSizes = productType === "card" && rankOptions.length > 0 ? rankOptions : sizes;
  return sourceSizes.flatMap((size) => {
    if (!isJpyCurrency(size.currency)) return [];
    const price = parseJpyNumber(size.price ?? size.priceFormat);
    if (price === null) return [];
    const rawLabel = String(size.size?.text ?? "").trim();
    const quantityMatch = rawLabel.match(/\b(\d+)\s*(?:box|boxes|pack|packs|item|items|card|cards)\b|^(\d+)\s*個/i);
    const quantity = Number(quantityMatch?.[1] ?? quantityMatch?.[2]);
    return [{
      quantity: Number.isInteger(quantity) && quantity > 0 && quantity <= 10 ? quantity : null,
      label: rawLabel || (productType === "card" ? `Rank ${cardRank}` : productType === "pack" ? "Pack" : "Box"),
      price,
      listingCount: typeof (size as { listingCount?: unknown }).listingCount === "number" ? (size as { listingCount: number }).listingCount : null,
    }];
  }).sort((left, right) => (left.quantity ?? 99) - (right.quantity ?? 99)).slice(0, 10);
}

/** Returns only publicly available JPY quantity prices; missing choices are never estimated. */
export async function fetchSnkrdunkQuantityPrices(sourceUrl: string, productType: SnkrdunkProductType = "box", cardRank: CardRank = "A"): Promise<SnkrdunkQuantityPrice[]> {
  if (!isValidSnkrdunkUrl(sourceUrl)) throw new SnkrdunkSyncError("Link phải là trang sản phẩm https://snkrdunk.com, không phải link danh mục.");
  const html = await fetchPublicHtml(sourceUrl);
  const renderedChoices = parseSnkrdunkQuantityPrices(html, productType);
  if (renderedChoices.length > 0) return renderedChoices;

  const productCode = extractProductCode(sourceUrl, html);
  if (productCode) {
    const apiChoices = await fetchJpySizePrices(productCode, productType, cardRank);
    if (apiChoices.length > 0) return apiChoices;
  }

  const japaneseFallbackUrl = getJapaneseProductFallbackUrl(sourceUrl);
  if (japaneseFallbackUrl) {
    try {
      return parseSnkrdunkQuantityPrices(await fetchPublicHtml(japaneseFallbackUrl), productType);
    } catch {
      return [];
    }
  }
  return [];
}

export async function fetchSnkrdunkPrice(sourceUrl: string, productType?: SnkrdunkProductType, cardRank: CardRank = "A"): Promise<SnkrdunkPriceResult> {
  if (!isValidSnkrdunkUrl(sourceUrl)) {
    throw new SnkrdunkSyncError(
      "Link phải là trang sản phẩm https://snkrdunk.com, không phải link danh mục.",
    );
  }

  const html = await fetchPublicHtml(sourceUrl);
  if (productType === "card") {
    const rankPrice = parseCardRankPrice(html, cardRank);
    if (rankPrice !== null) return { price: rankPrice, sourceUrl };

    const japaneseFallbackUrl = getJapaneseProductFallbackUrl(sourceUrl);
    if (japaneseFallbackUrl) {
      try {
        const japaneseHtml = await fetchPublicHtml(japaneseFallbackUrl);
        const japaneseRankPrice = parseCardRankPrice(japaneseHtml, cardRank);
        if (japaneseRankPrice !== null) return { price: japaneseRankPrice, sourceUrl };
      } catch {
        // Preserve the explicit rank error below when the localized page is unavailable.
      }
    }

    throw new SnkrdunkSyncError(
      `Không tìm thấy giá JPY Rank ${cardRank} (${cardRank}あり) công khai trên SNKRDUNK. Giá chưa được cập nhật.`,
    );
  }

  const htmlPrice = parseSnkrdunkPrice(html);
  if (htmlPrice !== null) return { price: htmlPrice, sourceUrl };

  const productCode = extractProductCode(sourceUrl, html);
  let apiError: SnkrdunkSyncError | null = null;
  if (productCode) {
    try {
      return {
        price: await fetchFirstSizePrice(productCode),
        sourceUrl,
      };
    } catch (error) {
      apiError = error instanceof SnkrdunkSyncError ? error : null;
    }
  }

  const japaneseFallbackUrl = getJapaneseProductFallbackUrl(sourceUrl);
  if (japaneseFallbackUrl) {
    try {
      const japaneseHtml = await fetchPublicHtml(japaneseFallbackUrl);
      const japanesePrice = parseSnkrdunkPrice(japaneseHtml);
      if (japanesePrice !== null) return { price: japanesePrice, sourceUrl };
    } catch {
      // Preserve the original API/page error below when the fallback has no public price.
    }
  }

  if (apiError) throw apiError;
  throw new SnkrdunkSyncError(
    "Không xác định được mã sản phẩm hoặc giá JPY công khai trên SNKRDUNK. Giá chưa được cập nhật.",
  );
}
import type { CardRank } from "../shared/cardRank";
