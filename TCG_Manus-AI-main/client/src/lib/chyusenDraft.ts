import { formatChyusenDayMonth } from "@shared/chyusenDate";

export type ChyusenDraft = {
  title: string;
  productName: string;
  series: string;
  productType: "card" | "box" | "pack" | "set" | "other";
  shop: string;
  customShopName: string;
  sourceUrl: string;
  externalProductId: string;
  imageUrl: string;
  price: string;
  quantityLimit: string;
  applicationStart: string;
  applicationEnd: string;
  resultDate: string;
  pickupStart: string;
  pickupEnd: string;
  pickupNote: string;
  requirements: string;
  parserStatus: "manual" | "partial" | "detected" | "unavailable";
  parserNote: string;
  fieldConfidence: Record<string, "detected" | "needs_review" | "missing">;
  sourceContentHash?: string;
};

export const EMPTY_CHYUSEN_DRAFT: ChyusenDraft = {
  title: "", productName: "", series: "Pokemon", productType: "other", shop: "Khác", customShopName: "", sourceUrl: "", externalProductId: "", imageUrl: "", price: "", quantityLimit: "",
  applicationStart: "", applicationEnd: "", resultDate: "", pickupStart: "", pickupEnd: "", pickupNote: "", requirements: "", parserStatus: "manual", parserNote: "", fieldConfidence: {},
};

export function toChyusenDraft(data: Record<string, any>): ChyusenDraft {
  return {
    title: data.title || "", productName: data.productName || "", series: data.series || "Pokemon", productType: data.productType || "other",
    shop: data.shop || "Khác", customShopName: data.customShopName || "", sourceUrl: data.sourceUrl || "", externalProductId: data.externalProductId || "", imageUrl: data.imageUrl || "",
    price: data.price === undefined || data.price === null ? "" : String(data.price), quantityLimit: data.quantityLimit || "",
    applicationStart: formatChyusenDayMonth(data.applicationStart), applicationEnd: formatChyusenDayMonth(data.applicationEnd), resultDate: formatChyusenDayMonth(data.resultDate),
    pickupStart: formatChyusenDayMonth(data.pickupStart), pickupEnd: formatChyusenDayMonth(data.pickupEnd), pickupNote: data.pickupNote || "", requirements: data.requirements || "",
    parserStatus: data.parserStatus || "manual", parserNote: data.parserNote || "", fieldConfidence: data.fieldConfidence || {}, sourceContentHash: data.sourceContentHash,
  };
}
