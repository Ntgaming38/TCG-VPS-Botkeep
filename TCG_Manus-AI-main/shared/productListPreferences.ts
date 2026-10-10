export const PRODUCT_LIST_COLUMN_OPTIONS = [
  { key: "quantity", label: "Số lượng" },
  { key: "buyPrice", label: "Giá mua" },
  { key: "marketPrice", label: "Giá thị trường" },
  { key: "profit", label: "Lợi nhuận" },
  { key: "series", label: "Series / Set" },
  { key: "rarity", label: "Độ hiếm" },
  { key: "status", label: "Trạng thái" },
] as const;

export type ProductListColumnKey = typeof PRODUCT_LIST_COLUMN_OPTIONS[number]["key"];
export const DEFAULT_PRODUCT_LIST_COLUMNS: ProductListColumnKey[] = ["quantity", "buyPrice", "marketPrice", "profit"];
