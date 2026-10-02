import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { extractAssistantText } from "./aiResponse";

const productTypes = ["card", "box", "pack", "set", "other"] as const;
const confidenceLevels = ["high", "medium", "low"] as const;

export const chyusenImageAnalysisSchema = z.object({
  title: z.string().nullable(),
  productName: z.string().nullable(),
  series: z.string().nullable(),
  productType: z.enum(productTypes),
  shop: z.string().nullable(),
  price: z.number().nullable(),
  quantityLimit: z.string().nullable(),
  applicationStart: z.string().nullable(),
  applicationEnd: z.string().nullable(),
  resultDate: z.string().nullable(),
  pickupStart: z.string().nullable(),
  pickupNote: z.string().nullable(),
  requirements: z.string().nullable(),
  fieldConfidence: z.record(z.string(), z.enum(confidenceLevels)),
  fieldEvidence: z.record(z.string(), z.string()).default({}),
  note: z.string(),
});

export type ChyusenImageAnalysis = z.infer<typeof chyusenImageAnalysisSchema>;

const dateFields = ["applicationStart", "applicationEnd", "resultDate", "pickupStart"] as const;

function currentTokyoYear(now = new Date()) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tokyo", year: "numeric" }).format(now);
}

function normalizeVisibleJapaneseDate(value: string | null) {
  if (!value) return { value, inferredYear: false };
  if (/^20\d{2}-\d{2}-\d{2}T/.test(value)) return { value, inferredYear: false };
  const visibleValue = value.replace(/[（(][月火水木金土日][）)]/g, "").trim();
  const match = visibleValue.match(/(?:(20\d{2})\s*(?:年|[-/.]))?\s*(\d{1,2})\s*(?:月|[-/.])\s*(\d{1,2})\s*(?:日)?(?:\s+\d{1,2}[:：]\d{2}(?::\d{2})?)?/);
  if (!match) return { value: null, inferredYear: false };
  const year = match[1] || currentTokyoYear();
  const month = Number(match[2]);
  const day = Number(match[3]);
  const checked = new Date(Date.UTC(Number(year), month - 1, day));
  if (checked.getUTCFullYear() !== Number(year) || checked.getUTCMonth() !== month - 1 || checked.getUTCDate() !== day) return { value: null, inferredYear: false };
  return { value: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00+09:00`, inferredYear: !match[1] };
}

function normalizeImageAnalysisDates(analysis: ChyusenImageAnalysis): ChyusenImageAnalysis {
  const normalized = { ...analysis, fieldConfidence: { ...analysis.fieldConfidence } };
  const assumedCurrentYear: string[] = [];
  for (const field of dateFields) {
    const result = normalizeVisibleJapaneseDate(normalized[field]);
    normalized[field] = result.value;
    if (result.inferredYear && result.value) {
      normalized.fieldConfidence[field] = "medium";
      assumedCurrentYear.push(field);
    }
  }
  if (!assumedCurrentYear.length) return normalized;
  return {
    ...normalized,
    note: `${normalized.note} Các ngày chỉ có tháng/ngày được gán năm hiện tại theo giờ Nhật; hãy kiểm tra lại trước khi lưu.`,
  };
}

function validateImageDataUrl(imageDataUrl: string) {
  if (!/^data:image\/(png|jpe?g|webp);base64,[a-zA-Z0-9+/=\s]+$/.test(imageDataUrl)) {
    throw new Error("Ảnh không hợp lệ. Hãy dùng PNG, JPEG hoặc WEBP.");
  }
}

function validateImageDataUrls(imageDataUrls: string[]) {
  if (!imageDataUrls.length || imageDataUrls.length > 8) throw new Error("Hãy tải từ 1 đến 4 ảnh thông báo.");
  imageDataUrls.forEach(validateImageDataUrl);
  if (imageDataUrls.reduce((total, image) => total + image.length, 0) > 20_000_000) {
    throw new Error("Tổng dung lượng ảnh đã nén quá lớn. Hãy dùng tối đa 4 ảnh PNG, JPEG hoặc WEBP.");
  }
}

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("Không tìm thấy JSON");
    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

function normalizeAnalysisPayload(value: unknown) {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const textOrNull = (key: string) => typeof record[key] === "string" && record[key].trim() ? record[key].trim() : null;
  const validConfidence = new Set(confidenceLevels);
  const fieldConfidence = Object.fromEntries(Object.entries(record.fieldConfidence && typeof record.fieldConfidence === "object" ? record.fieldConfidence as Record<string, unknown> : {}).filter(([, confidence]) => typeof confidence === "string" && validConfidence.has(confidence as (typeof confidenceLevels)[number]))) as Record<string, "high" | "medium" | "low">;
  const sourceExcerpt = textOrNull("sourceExcerpt");
  const suppliedEvidence = Object.fromEntries(Object.entries(record.fieldEvidence && typeof record.fieldEvidence === "object" ? record.fieldEvidence as Record<string, unknown> : {}).filter(([, evidence]) => typeof evidence === "string" && evidence.trim()).map(([field, evidence]) => [field, (evidence as string).trim().slice(0, 160)]));
  const fallbackEvidence = sourceExcerpt ? Object.fromEntries(["title", "productName", "shop", "applicationStart", "applicationEnd", "resultDate", "pickupStart"].filter((field) => textOrNull(field)).map((field) => [field, sourceExcerpt])) : {};
  const numericPrice = typeof record.price === "number" ? record.price : typeof record.price === "string" ? Number(record.price.replace(/[^0-9.-]/g, "")) : null;
  const sourceSeries = textOrNull("series");
  const series = sourceSeries && /pokemon|ポケモン/i.test(sourceSeries) ? "Pokemon" : sourceSeries && /one\s*piece|ワンピース/i.test(sourceSeries) ? "One Piece" : sourceSeries && /dragon\s*ball|ドラゴンボール/i.test(sourceSeries) ? "Dragon Ball" : sourceSeries && /yu-?gi-?oh|遊戯王/i.test(sourceSeries) ? "Yu-Gi-Oh!" : sourceSeries || "Other";
  return {
    title: textOrNull("title"), productName: textOrNull("productName"), series,
    productType: productTypes.includes(record.productType as (typeof productTypes)[number]) ? record.productType : "other",
    shop: textOrNull("shop"), price: numericPrice !== null && Number.isFinite(numericPrice) ? numericPrice : null,
    quantityLimit: textOrNull("quantityLimit"), applicationStart: textOrNull("applicationStart"), applicationEnd: textOrNull("applicationEnd"), resultDate: textOrNull("resultDate"), pickupStart: textOrNull("pickupStart"), pickupNote: textOrNull("pickupNote"), requirements: textOrNull("requirements"), fieldConfidence, fieldEvidence: { ...fallbackEvidence, ...suppliedEvidence }, note: textOrNull("note") || sourceExcerpt || "AI đã đọc ảnh. Hãy kiểm tra các trường trước khi lưu.",
  };
}

export function parseChyusenImageAnalysis(raw: string): ChyusenImageAnalysis {
  return normalizeImageAnalysisDates(chyusenImageAnalysisSchema.parse(normalizeAnalysisPayload(extractJsonObject(raw))));
}

export async function analyzeChyusenImages(imageDataUrls: string[]): Promise<ChyusenImageAnalysis> {
  validateImageDataUrls(imageDataUrls);
  const response = await invokeLLM({
    model: "gemini-3-flash-preview",
    maxTokens: 2200,
    responseFormat: {
      type: "json_schema",
      json_schema: {
        name: "chyusen_image_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            title: { type: ["string", "null"] },
            productName: { type: ["string", "null"] },
            series: { type: ["string", "null"] },
            productType: { type: "string", enum: [...productTypes] },
            shop: { type: ["string", "null"] },
            price: { type: ["number", "null"] },
            quantityLimit: { type: ["string", "null"] },
            applicationStart: { type: ["string", "null"] },
            applicationEnd: { type: ["string", "null"] },
            resultDate: { type: ["string", "null"] },
            pickupStart: { type: ["string", "null"] },
            pickupNote: { type: ["string", "null"] },
            requirements: { type: ["string", "null"] },
            sourceExcerpt: { type: ["string", "null"] },
            note: { type: "string" },
          },
          required: ["title", "productName", "series", "productType", "shop", "price", "quantityLimit", "applicationStart", "applicationEnd", "resultDate", "pickupStart", "pickupNote", "requirements", "sourceExcerpt", "note"],
          additionalProperties: false,
        },
      },
    },
    messages: [
      {
        role: "system",
        content: "Extract only facts visibly written across these Japanese Chyusen announcement images. Treat the images as one source; a later image may clarify or continue an earlier image. Never invent missing facts. First distinguish labels: application start (応募開始/受付開始), deadline (応募締切/受付締切), result announcement (当選発表/結果発表), and pickup (受取). For dates with explicit year/month/day, return ISO 8601 with +09:00. If an image visibly has month/day but omits year or time, return exactly MM/DD, never guess a year or time; the application will flag it for review. Use null for unreadable or conflicting values. Keep Japanese product names exactly as shown. Use only these series: Pokemon, One Piece, Dragon Ball, Yu-Gi-Oh!, Other. Return one short exact sourceExcerpt from the visible image (max 180 characters) that supports the key dates and product. Keep note to one concise sentence. Do not return field-by-field evidence or confidence objects. Return JSON only.",
      },
      { role: "user", content: [{ type: "text", text: `Read ${imageDataUrls.length} image(s) in order and extract one Chyusen record.` }, ...imageDataUrls.map((url) => ({ type: "image_url" as const, image_url: { url, detail: "auto" as const } }))] },
    ],
  });
  const raw = extractAssistantText(response);
  try {
    if (!raw) throw new Error("Phản hồi AI trống");
    return parseChyusenImageAnalysis(raw);
  } catch {
    const retry = await invokeLLM({
      model: "gemini-3-flash-preview",
      maxTokens: 1800,
      messages: [
        { role: "system", content: "Read the Japanese Chyusen image precisely. Return one compact JSON object only. Include visible title, productName, series, productType, shop, price, quantityLimit, applicationStart, applicationEnd, resultDate, pickupStart, pickupNote, requirements, sourceExcerpt, and note. Use null for missing values. Dates may be ISO or Japanese year/month/day. Do not add explanations or markdown." },
        { role: "user", content: [{ type: "text", text: `Retry reading ${imageDataUrls.length} image(s) in order. Keep the JSON concise.` }, ...imageDataUrls.map((url) => ({ type: "image_url" as const, image_url: { url, detail: "high" as const } }))] },
      ],
    });
    const retryRaw = extractAssistantText(retry);
    try {
      if (!retryRaw) throw new Error("Phản hồi AI trống");
      return parseChyusenImageAnalysis(retryRaw);
    } catch {
      throw new Error("AI trả về dữ liệu ảnh không hợp lệ. Hãy thử lại hoặc nhập thủ công.");
    }
  }
}

export async function analyzeChyusenImage(imageDataUrl: string): Promise<ChyusenImageAnalysis> {
  return analyzeChyusenImages([imageDataUrl]);
}
