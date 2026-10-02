import { invokeLLM } from "./_core/llm";
import { extractAssistantText } from "./aiResponse";
import {
  CHYUSEN_TIMEZONE,
  detectPrice,
  detectProductType,
  detectQuantityLimit,
  detectSeries,
  detectShop,
  extractExplicitTokyoDates,
  extractJapaneseDateMentions,
  extractHtmlTitle,
  extractMetaImage,
  findDateNearKeywords,
  findVisibleDateNearKeywords,
  getSourceLabel,
  hashSourceContent,
  stripHtml,
  validatePublicChyusenUrl,
} from "./chyusenUtils";

export type ChyusenPreview = {
  title: string;
  productName: string;
  series: string;
  productType: "card" | "box" | "pack" | "set" | "other";
  shop: string;
  customShopName?: string;
  sourceUrl: string;
  externalProductId?: string;
  imageUrl?: string;
  price?: number | null;
  quantityLimit?: string;
  applicationStart?: Date | null;
  applicationEnd?: Date | null;
  resultDate?: Date | null;
  pickupStart?: Date | null;
  pickupEnd?: Date | null;
  requirements?: string;
  parserStatus: "partial" | "detected" | "unavailable";
  parserNote: string;
  fieldConfidence: Record<string, "detected" | "needs_review" | "missing">;
  sourceContentHash?: string;
  sourceLabel: string;
};

export type FetchedChyusenSource = {
  url: string;
  html: string;
  text: string;
  title: string | null;
  imageUrl: string | null;
  contentHash: string;
};

const MAX_SOURCE_LENGTH = 24_000;

export function extractExternalProductIdFromUrl(rawUrl: string): string | undefined {
  try {
    const url = new URL(rawUrl);
    for (const key of ["product_id", "productId", "item_id", "itemId", "id"]) {
      const value = url.searchParams.get(key)?.trim();
      if (value && /^[A-Za-z0-9_-]{4,255}$/.test(value)) return value;
    }
    const bandaiMatch = url.pathname.match(/\/item\/item-([A-Za-z0-9_-]{4,255})/i);
    if (bandaiMatch?.[1]) return bandaiMatch[1];
    const match = url.pathname.match(/(?:item|product|products)[\/_-]([A-Za-z0-9_-]{4,255})/i);
    return match?.[1];
  } catch {
    return undefined;
  }
}

export async function fetchPublicChyusenSource(rawUrl: string): Promise<FetchedChyusenSource> {
  const validation = validatePublicChyusenUrl(rawUrl);
  if (!validation.valid || !validation.normalizedUrl) throw new Error(validation.reason || "URL không hợp lệ.");
  const sourceUrl = validation.normalizedUrl;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const url = new URL(sourceUrl);
    const isXPost = url.hostname === "x.com" || url.hostname === "www.x.com";
    const fetchUrl = isXPost
      ? `https://publish.twitter.com/oembed?omit_script=1&url=${encodeURIComponent(sourceUrl)}`
      : sourceUrl;
    const response = await fetch(fetchUrl, {
      headers: {
        "accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        "user-agent": "TCG-Manager-Chyusen-Monitor/1.0 (public source preview)",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    if (!response.ok) throw new Error(`Không thể truy cập website (HTTP ${response.status}).`);
    const raw = await response.text();
    const html = raw.slice(0, MAX_SOURCE_LENGTH);
    const text = stripHtml(html).slice(0, MAX_SOURCE_LENGTH);
    if (!text) throw new Error("Website không cho phép hệ thống tự động đọc nội dung công khai.");
    return {
      url: sourceUrl,
      html,
      text,
      title: extractHtmlTitle(html),
      imageUrl: extractMetaImage(html),
      contentHash: hashSourceContent(text),
    };
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError"
      ? "Không thể truy cập website trong thời gian cho phép."
      : error instanceof Error ? error.message : "Không thể truy cập website.";
    throw new Error(message);
  } finally {
    clearTimeout(timeout);
  }
}

function explicitDateFromIso(text: string, value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const sourceDates = extractExplicitTokyoDates(text);
  return sourceDates.some((sourceDate) => sourceDate.getTime() === date.getTime()) ? date : null;
}

function buildDeterministicPreview(source: FetchedChyusenSource): ChyusenPreview {
  const { text, title, url, imageUrl, contentHash } = source;
  const hasLotteryKeyword = /抽選|応募|受付期間|申込期間|当選発表/.test(text);
  const fullDates = extractExplicitTokyoDates(text);
  const dates = extractJapaneseDateMentions(text);
  const applicationStart = findVisibleDateNearKeywords(text, ["応募開始", "応募受付", "受付開始", "申込開始"])
    || (/(応募期間|受付期間|申込期間)/.test(text) ? dates[0] || null : null);
  const applicationEnd = findVisibleDateNearKeywords(text, ["応募締切", "受付締切", "締切", "応募期間", "受付期間", "申込期間"])
    || (/(応募期間|受付期間|申込期間)/.test(text) && dates.length >= 2 ? dates[1] : null);
  const resultDate = findVisibleDateNearKeywords(text, ["当選発表", "結果発表"]);
  const pickupStart = findVisibleDateNearKeywords(text, ["受取開始", "受取期間", "商品受取"]);
  const isFullySpecifiedDate = (value: Date | null) => Boolean(value && fullDates.some((date) => date.toLocaleDateString("en-CA", { timeZone: CHYUSEN_TIMEZONE }) === value.toLocaleDateString("en-CA", { timeZone: CHYUSEN_TIMEZONE })));
  const detectedShop = detectShop(text, url);
  const inferredTitle = title || getSourceLabel(url);
  const confidence: ChyusenPreview["fieldConfidence"] = {
    title: title ? "detected" : "needs_review",
    productName: title ? "needs_review" : "missing",
    shop: detectedShop.shop === "Khác" ? "needs_review" : "detected",
    applicationStart: applicationStart ? isFullySpecifiedDate(applicationStart) ? "detected" : "needs_review" : "missing",
    applicationEnd: applicationEnd ? isFullySpecifiedDate(applicationEnd) ? "detected" : "needs_review" : "missing",
    resultDate: resultDate ? isFullySpecifiedDate(resultDate) ? "detected" : "needs_review" : "missing",
    price: detectPrice(text) ? "detected" : "missing",
    quantityLimit: detectQuantityLimit(text) ? "detected" : "missing",
  };
  return {
    title: inferredTitle,
    productName: inferredTitle,
    series: detectSeries(text),
    productType: detectProductType(text),
    shop: detectedShop.shop,
    customShopName: detectedShop.customShopName,
    sourceUrl: url,
    externalProductId: extractExternalProductIdFromUrl(url),
    imageUrl: imageUrl || undefined,
    price: detectPrice(text),
    quantityLimit: detectQuantityLimit(text) || undefined,
    applicationStart,
    applicationEnd,
    resultDate,
    pickupStart,
    parserStatus: hasLotteryKeyword ? "partial" : "unavailable",
    parserNote: hasLotteryKeyword
      ? [applicationStart, applicationEnd, resultDate].some((date) => date && !isFullySpecifiedDate(date))
        ? "Đã đọc nội dung công khai và nhận diện ngày/tháng, nhưng nguồn chưa nêu đủ năm hoặc giờ. Hãy kiểm tra các trường vàng trước khi lưu."
        : "Đã đọc nội dung công khai. Hãy kiểm tra các trường được đánh dấu trước khi lưu."
      : "Không tìm thấy từ khóa Chyusen rõ ràng trong nội dung công khai; bạn có thể nhập thủ công.",
    fieldConfidence: confidence,
    sourceContentHash: contentHash,
    sourceLabel: getSourceLabel(url),
  };
}

async function enrichPreviewWithAI(source: FetchedChyusenSource, preview: ChyusenPreview): Promise<ChyusenPreview> {
  const response = await invokeLLM({
    model: "gpt-5-mini",
    maxTokens: 1400,
    responseFormat: {
      type: "json_schema",
      json_schema: {
        name: "chyusen_source_preview",
        strict: true,
        schema: {
          type: "object",
          properties: {
            title: { type: ["string", "null"] },
            productName: { type: ["string", "null"] },
            series: { type: ["string", "null"] },
            productType: { type: "string", enum: ["card", "box", "pack", "set", "other"] },
            shop: { type: ["string", "null"] },
            price: { type: ["number", "null"] },
            quantityLimit: { type: ["string", "null"] },
            applicationStart: { type: ["string", "null"] },
            applicationEnd: { type: ["string", "null"] },
            resultDate: { type: ["string", "null"] },
            requirements: { type: ["string", "null"] },
            note: { type: "string" },
          },
          required: ["title", "productName", "series", "productType", "shop", "price", "quantityLimit", "applicationStart", "applicationEnd", "resultDate", "requirements", "note"],
          additionalProperties: false,
        },
      },
    },
    messages: [
      {
        role: "system",
        content: "Extract only facts explicitly written in the public Japanese Chyusen source. Work in this order: identify the product and publisher; distinguish application start (応募開始/受付開始), application deadline (応募締切/受付締切), result announcement (当選発表/結果発表), and pickup terms (受取); then extract price, limit and requirements. Use null for missing or uncertain values. For dates, return ISO 8601 with +09:00 only if the source explicitly includes year, month, day and time; never invent a year, time, deadline, result date or price. Use only these series labels when supported by the text: Pokemon, One Piece, Dragon Ball, Yu-Gi-Oh!, Other. Keep Japanese product names exactly as written and explain any uncertainty in note.",
      },
      { role: "user", content: source.text },
    ],
  });
  const raw = extractAssistantText(response);
  if (!raw) return preview;
  let ai: Record<string, unknown>;
  try {
    ai = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { ...preview, parserNote: `${preview.parserNote} AI không trả về dữ liệu hợp lệ; các trường thiếu vẫn để trống.` };
  }
  const applicationStart = explicitDateFromIso(source.text, typeof ai.applicationStart === "string" ? ai.applicationStart : null) || preview.applicationStart || null;
  const applicationEnd = explicitDateFromIso(source.text, typeof ai.applicationEnd === "string" ? ai.applicationEnd : null) || preview.applicationEnd || null;
  const resultDate = explicitDateFromIso(source.text, typeof ai.resultDate === "string" ? ai.resultDate : null) || preview.resultDate || null;
  const title = typeof ai.title === "string" && ai.title.trim() ? ai.title.trim().slice(0, 255) : preview.title;
  const productName = typeof ai.productName === "string" && ai.productName.trim() ? ai.productName.trim().slice(0, 255) : preview.productName;
  const price = typeof ai.price === "number" && Number.isFinite(ai.price) ? ai.price : preview.price;
  return {
    ...preview,
    title,
    productName,
    series: typeof ai.series === "string" && ai.series.trim() ? ai.series.trim().slice(0, 100) : preview.series,
    productType: ["card", "box", "pack", "set", "other"].includes(String(ai.productType)) ? ai.productType as ChyusenPreview["productType"] : preview.productType,
    shop: typeof ai.shop === "string" && ai.shop.trim() ? ai.shop.trim().slice(0, 100) : preview.shop,
    price,
    quantityLimit: typeof ai.quantityLimit === "string" && ai.quantityLimit.trim() ? ai.quantityLimit.trim().slice(0, 100) : preview.quantityLimit,
    applicationStart,
    applicationEnd,
    resultDate,
    requirements: typeof ai.requirements === "string" && ai.requirements.trim() ? ai.requirements.trim().slice(0, 4000) : preview.requirements,
    parserStatus: preview.parserStatus === "unavailable" ? "unavailable" : "detected",
    parserNote: typeof ai.note === "string" && ai.note.trim() ? ai.note.trim().slice(0, 500) : preview.parserNote,
    fieldConfidence: {
      ...preview.fieldConfidence,
      title: title !== preview.title ? "needs_review" : preview.fieldConfidence.title,
      productName: productName !== preview.productName ? "needs_review" : preview.fieldConfidence.productName,
      applicationStart: applicationStart ? "needs_review" : "missing",
      applicationEnd: applicationEnd ? "needs_review" : "missing",
      resultDate: resultDate ? "needs_review" : "missing",
      price: price ? "needs_review" : preview.fieldConfidence.price,
    },
  };
}

/** Called only after the user explicitly presses “Đọc thông tin”. */
export async function parseChyusenUrl(rawUrl: string, useAI = true): Promise<ChyusenPreview> {
  try {
    const source = await fetchPublicChyusenSource(rawUrl);
    const deterministic = buildDeterministicPreview(source);
    return useAI && deterministic.parserStatus !== "unavailable"
      ? await enrichPreviewWithAI(source, deterministic)
      : deterministic;
  } catch (error) {
    const validation = validatePublicChyusenUrl(rawUrl);
    return {
      title: getSourceLabel(rawUrl),
      productName: "",
      series: "Pokemon",
      productType: "other",
      shop: "Khác",
      sourceUrl: validation.normalizedUrl || rawUrl,
      externalProductId: extractExternalProductIdFromUrl(validation.normalizedUrl || rawUrl),
      parserStatus: "unavailable",
      parserNote: error instanceof Error ? error.message : "Không thể tự động đọc đầy đủ thông tin từ website này.",
      fieldConfidence: {},
      sourceLabel: getSourceLabel(rawUrl),
    };
  }
}
