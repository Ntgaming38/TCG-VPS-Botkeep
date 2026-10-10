export const CHYUSEN_AI_FIELDS = [
  "title", "productName", "series", "productType", "shop", "price", "quantityLimit",
  "applicationStart", "applicationEnd", "resultDate", "pickupStart", "pickupNote", "requirements",
] as const;

export type ChyusenAiField = typeof CHYUSEN_AI_FIELDS[number];

export function getChyusenAiFilledFields(values: Partial<Record<ChyusenAiField, unknown>>) {
  return CHYUSEN_AI_FIELDS.filter((field) => {
    const value = values[field];
    return value !== null && value !== undefined && value !== "";
  });
}
