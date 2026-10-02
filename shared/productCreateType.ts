export const PRODUCT_TYPES = ["card", "box", "pack", "junk_pack"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export function productTypeLabel(type: string) {
  if (type === "card") return "Card";
  if (type === "box") return "Box";
  if (type === "pack") return "Pack";
  if (type === "junk_pack") return "Pack Rác";
  return "Sản phẩm";
}

export function getAutoCreateProductType(activeType: string): ProductType | null {
  return PRODUCT_TYPES.includes(activeType as ProductType) ? activeType as ProductType : null;
}
