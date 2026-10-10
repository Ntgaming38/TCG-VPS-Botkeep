const SNKRDUNK_HOSTS = new Set(["snkrdunk.com", "www.snkrdunk.com"]);

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

export function parseFirstRankAPrice(html: string): number | null {
  const decoded = decodeHtmlEntities(html);
  const buttons = decoded.match(/<button\b[^>]*>[\s\S]*?<\/button>/gi) ?? [];
  for (const button of buttons) {
    if (!/(?:>\s*A(?:あり)?\s*<|>\s*A\s*<)/i.test(button)) continue;
    const priceMatch = button.match(/(?:¥|円)(?:<[^>]+>)*\s*([\d,]+)/i);
    const price = priceMatch ? parseJpyNumber(priceMatch[1]) : null;
    if (price !== null) return price;
  }

  const fallbackMatch = decoded.match(/(?:Aあり|>\s*A\s*<)[\s\S]{0,500}?(?:¥|円)(?:<[^>]+>)*\s*([\d,]+)/i);
  return fallbackMatch ? parseJpyNumber(fallbackMatch[1]) : null;
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
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new SnkrdunkSyncError("Không thể truy cập trang sản phẩm SNKRDUNK.");
  }

  if (!response.ok) {
    throw new SnkrdunkSyncError(`SNKRDUNK trả về lỗi HTTP ${response.status}.`);
  }
  return response.text();
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
      signal: AbortSignal.timeout(15_000),
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

export async function fetchSnkrdunkPrice(sourceUrl: string, productType?: SnkrdunkProductType): Promise<SnkrdunkPriceResult> {
  if (!isValidSnkrdunkUrl(sourceUrl)) {
    throw new SnkrdunkSyncError(
      "Link phải là trang sản phẩm https://snkrdunk.com, không phải link danh mục.",
    );
  }

  const html = await fetchPublicHtml(sourceUrl);
  if (productType === "card") {
    const rankAPrice = parseFirstRankAPrice(html);
    if (rankAPrice !== null) return { price: rankAPrice, sourceUrl };

    const japaneseFallbackUrl = getJapaneseProductFallbackUrl(sourceUrl);
    if (japaneseFallbackUrl) {
      try {
        const japaneseHtml = await fetchPublicHtml(japaneseFallbackUrl);
        const japaneseRankAPrice = parseFirstRankAPrice(japaneseHtml);
        if (japaneseRankAPrice !== null) return { price: japaneseRankAPrice, sourceUrl };
      } catch {
        // Preserve the explicit Rank A error below when the localized page is unavailable.
      }
    }

    throw new SnkrdunkSyncError(
      "Không tìm thấy giá JPY hạng A (Aあり) công khai trên SNKRDUNK. Giá chưa được cập nhật.",
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
