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
  note: z.string(),
});

export type ChyusenImageAnalysis = z.infer<typeof chyusenImageAnalysisSchema>;

function validateImageDataUrl(imageDataUrl: string) {
  if (!/^data:image\/(png|jpe?g|webp);base64,[a-zA-Z0-9+/=\s]+$/.test(imageDataUrl)) {
    throw new Error("Ảnh không hợp lệ. Hãy dùng PNG, JPEG hoặc WEBP.");
  }
}

export function parseChyusenImageAnalysis(raw: string): ChyusenImageAnalysis {
  return chyusenImageAnalysisSchema.parse(JSON.parse(raw));
}

export async function analyzeChyusenImage(imageDataUrl: string): Promise<ChyusenImageAnalysis> {
  validateImageDataUrl(imageDataUrl);
  const response = await invokeLLM({
    model: "gemini-3-flash-preview",
    maxTokens: 1200,
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
            fieldConfidence: { type: "object", additionalProperties: { type: "string", enum: [...confidenceLevels] } },
            note: { type: "string" },
          },
          required: ["title", "productName", "series", "productType", "shop", "price", "quantityLimit", "applicationStart", "applicationEnd", "resultDate", "pickupStart", "pickupNote", "requirements", "fieldConfidence", "note"],
          additionalProperties: false,
        },
      },
    },
    messages: [
      {
        role: "system",
        content: "You extract only facts visibly written in a Japanese lottery / Chyusen announcement image. Never guess or infer missing facts. Use null when any field is missing or uncertain. For exact dates, return ISO 8601 with +09:00 only if the image explicitly states year, month, and day; otherwise put wording such as early or late month in pickupNote only. Keep Japanese names exactly as shown. For each non-null field, include fieldConfidence: high only when clearly and directly legible, medium when visible but needs human verification, low when partially obscured. Omit confidence for null fields. Return JSON only.",
      },
      { role: "user", content: [{ type: "text", text: "Read this image and extract Chyusen details." }, { type: "image_url", image_url: { url: imageDataUrl, detail: "high" } }] },
    ],
  });
  const raw = extractAssistantText(response);
  if (!raw) throw new Error("AI chưa đọc được nội dung từ ảnh này. Hãy thử ảnh rõ hơn hoặc nhập thủ công.");
  try {
    return parseChyusenImageAnalysis(raw);
  } catch {
    throw new Error("AI trả về dữ liệu ảnh không hợp lệ. Hãy thử lại hoặc nhập thủ công.");
  }
}
