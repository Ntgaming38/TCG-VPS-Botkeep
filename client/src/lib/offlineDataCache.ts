/**
 * Tiny localStorage-backed snapshot store for offline viewing. Every time a
 * list query succeeds online, the page saves its result here; when the same
 * query later fails (no network), the page renders the snapshot instead of an
 * empty screen and labels it with the time it was saved.
 *
 * Pure logic with an injectable storage so it can be unit-tested in Node.
 */

export interface OfflineSnapshot<T> {
  data: T;
  savedAt: number;
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const PREFIX = "tcg-offline-cache:v1:";

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function saveOfflineSnapshot(key: string, data: unknown, storage: StorageLike | null = defaultStorage(), now: number = Date.now()): boolean {
  if (!storage) return false;
  try {
    const snapshot: OfflineSnapshot<unknown> = { data, savedAt: now };
    storage.setItem(PREFIX + key, JSON.stringify(snapshot));
    return true;
  } catch {
    // Quota exceeded or storage unavailable: offline viewing is best-effort.
    return false;
  }
}

export function readOfflineSnapshot<T>(key: string, storage: StorageLike | null = defaultStorage()): OfflineSnapshot<T> | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OfflineSnapshot<T>;
    if (typeof parsed?.savedAt !== "number" || !("data" in parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearOfflineSnapshot(key: string, storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

/** Stable cache key for a products.list input (key order independent). */
export function productsListCacheKey(input: { type?: string; status?: string; search?: string }): string {
  const normalized: Record<string, string> = {};
  if (input.type) normalized.type = input.type;
  if (input.status) normalized.status = input.status;
  if (input.search) normalized.search = input.search;
  return `products.list:${JSON.stringify(normalized)}`;
}

export const INVENTORY_DEFAULT_LIST_INPUT = { status: "all" } as const;
export const IN_STOCK_CACHE_KEY = "products.inStock";

export interface OfflineFilterableProduct {
  name?: string | null;
  type?: string | null;
  status?: string | null;
}

/**
 * Client-side mirror of the server's products.list filtering (server/db.ts
 * listProducts), used only to narrow the saved full-inventory snapshot when
 * the exact filtered snapshot does not exist. One known approximation: the
 * server additionally applies a catalog-visibility filter when no status is
 * given; the snapshot comes from real responses, so the difference is minor.
 */
export function filterProductsOffline<T extends OfflineFilterableProduct>(products: T[], input: { type?: string; status?: string; search?: string }): T[] {
  let rows = products;
  if (input.type) rows = rows.filter((product) => product.type === input.type);
  if (input.status === "all") {
    // "all" includes sold items on the server too.
  } else if (input.status) {
    rows = rows.filter((product) => product.status === input.status);
  } else {
    rows = rows.filter((product) => product.status !== "sold");
  }
  if (input.search) {
    const needle = input.search.toLowerCase();
    rows = rows.filter((product) => (product.name ?? "").toLowerCase().includes(needle));
  }
  return rows;
}

/**
 * Fallback chain for a failed products.list query: the exact snapshot for
 * this input if one was saved, otherwise the saved default inventory view
 * narrowed client-side with the same filters the server would apply.
 */
export function resolveProductsListFallback<T extends OfflineFilterableProduct>(
  input: { type?: string; status?: string; search?: string },
  storage: StorageLike | null = defaultStorage(),
): OfflineSnapshot<T[]> | null {
  const exact = readOfflineSnapshot<T[]>(productsListCacheKey(input), storage);
  if (exact) return exact;
  const base = readOfflineSnapshot<T[]>(productsListCacheKey(INVENTORY_DEFAULT_LIST_INPUT), storage);
  if (!base) return null;
  return { data: filterProductsOffline(base.data, input), savedAt: base.savedAt };
}
