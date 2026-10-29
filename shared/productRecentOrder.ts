export type RecentProductLike = {
  id?: number | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  /** Newest purchase-record date for this lot, when the server provides it. */
  latestPurchaseDate?: Date | string | null;
};

function timestamp(value: Date | string | null | undefined) {
  if (!value) return Number.NEGATIVE_INFINITY;
  const parsed = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

/**
 * Default product order across the app: latest purchase date first.
 * A lot's purchase date is its newest purchase record; lots without any
 * purchase record fall back to the date the lot was created (which is
 * when it was added, normally right after buying). Edits and price syncs
 * (updatedAt) must NOT reshuffle this order.
 */
export function sortProductsByRecentPurchase<T extends RecentProductLike>(products: T[]) {
  return [...products].sort((left, right) => {
    const leftPurchase = timestamp(left.latestPurchaseDate ?? left.createdAt);
    const rightPurchase = timestamp(right.latestPurchaseDate ?? right.createdAt);
    if (leftPurchase !== rightPurchase) return rightPurchase - leftPurchase;
    const leftCreated = timestamp(left.createdAt);
    const rightCreated = timestamp(right.createdAt);
    if (leftCreated !== rightCreated) return rightCreated - leftCreated;
    return Number(right.id || 0) - Number(left.id || 0);
  });
}
