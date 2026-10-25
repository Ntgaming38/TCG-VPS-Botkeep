/**
 * Offline sale drafts. When a sale is submitted with no network, the exact
 * payload the form would have sent to sales.create is stored on the device
 * instead; once connectivity returns, the Bán Hàng page offers to sync each
 * draft verbatim (the server remains the source of truth for stock checks —
 * if the product sold out meanwhile, the sync fails and the draft stays).
 *
 * Pure logic with an injectable storage so it can be unit-tested in Node.
 */

export interface OfflineSaleDraftPayload {
  productId: number;
  quantity: number;
  salePrice: number;
  platform?: string;
  saleLocation?: string | null;
  fee?: number;
  shippingFee?: number;
  otherCost?: number;
  note?: string;
  isDamaged?: boolean;
}

export interface OfflineSaleDraft {
  id: string;
  createdAt: number;
  /** Captured at save time so the draft list stays readable offline. */
  productName: string;
  payload: OfflineSaleDraftPayload;
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const STORAGE_KEY = "tcg-offline-sale-drafts:v1";

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function listOfflineSaleDrafts(storage: StorageLike | null = defaultStorage()): OfflineSaleDraft[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OfflineSaleDraft[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((draft) => draft && typeof draft.id === "string" && draft.payload && typeof draft.payload.productId === "number");
  } catch {
    return [];
  }
}

function persist(drafts: OfflineSaleDraft[], storage: StorageLike | null): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  } catch {
    /* quota/storage unavailable: drafts are best-effort */
  }
}

export function addOfflineSaleDraft(
  payload: OfflineSaleDraftPayload,
  productName: string,
  storage: StorageLike | null = defaultStorage(),
  now: number = Date.now(),
  id: string = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `draft-${now}-${Math.random().toString(36).slice(2, 10)}`,
): OfflineSaleDraft {
  const draft: OfflineSaleDraft = { id, createdAt: now, productName, payload: { ...payload } };
  persist([...listOfflineSaleDrafts(storage), draft], storage);
  return draft;
}

export function removeOfflineSaleDraft(id: string, storage: StorageLike | null = defaultStorage()): OfflineSaleDraft[] {
  const next = listOfflineSaleDrafts(storage).filter((draft) => draft.id !== id);
  persist(next, storage);
  return next;
}

/** Gross amount of a draft (salePrice × quantity), before fees — display only. */
export function offlineSaleDraftGross(draft: OfflineSaleDraft): number {
  return (draft.payload.salePrice || 0) * (draft.payload.quantity || 0);
}
