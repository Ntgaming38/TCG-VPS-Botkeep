export const INVENTORY_STATUS_ORDER = ["in_stock", "reserved", "sold", "traded", "damaged"] as const;

const STATUS_PRIORITY = Object.fromEntries(INVENTORY_STATUS_ORDER.map((status, index) => [status, index]));

export function sortInventoryByStatus<T extends { status?: string | null }>(products: T[]) {
  return products
    .map((product, index) => ({ product, index }))
    .sort((left, right) => {
      const leftPriority = STATUS_PRIORITY[left.product.status || ""] ?? INVENTORY_STATUS_ORDER.length;
      const rightPriority = STATUS_PRIORITY[right.product.status || ""] ?? INVENTORY_STATUS_ORDER.length;
      return leftPriority - rightPriority || left.index - right.index;
    })
    .map(({ product }) => product);
}
