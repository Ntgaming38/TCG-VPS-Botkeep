export type RecentProductLike = {
  id?: number | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
};

function timestamp(value: Date | string | null | undefined) {
  if (!value) return Number.NEGATIVE_INFINITY;
  const parsed = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

/** Sorts inventory/product lots by their latest purchase or update, newest first. */
export function sortProductsByRecentPurchase<T extends RecentProductLike>(products: T[]) {
  return [...products].sort((left, right) => {
    const leftUpdated = timestamp(left.updatedAt);
    const rightUpdated = timestamp(right.updatedAt);
    if (leftUpdated !== rightUpdated) return rightUpdated - leftUpdated;
    const leftCreated = timestamp(left.createdAt);
    const rightCreated = timestamp(right.createdAt);
    if (leftCreated !== rightCreated) return rightCreated - leftCreated;
    return Number(right.id || 0) - Number(left.id || 0);
  });
}
