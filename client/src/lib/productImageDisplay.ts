export const PRODUCT_IMAGE_ZOOM_STORAGE_KEY = "tcg-product-image-zoom";
export const PRODUCT_IMAGE_ZOOM_CARD_STORAGE_KEY = "tcg-product-image-zoom-card";
export const PRODUCT_IMAGE_ZOOM_BOX_PACK_STORAGE_KEY = "tcg-product-image-zoom-box-pack";
export const PRODUCT_IMAGE_ZOOM_CHANGED_EVENT = "tcg-product-image-zoom-changed";
export const DEFAULT_PRODUCT_IMAGE_ZOOM = 1.12;
export const DEFAULT_CARD_PRODUCT_IMAGE_ZOOM = 1.12;
export const DEFAULT_BOX_PACK_PRODUCT_IMAGE_ZOOM = 1.12;
export const PRODUCT_IMAGE_ZOOM_OPTIONS = [1, 1.06, 1.12, 1.18, 1.24] as const;

export type ProductImageZoom = (typeof PRODUCT_IMAGE_ZOOM_OPTIONS)[number];
export type ProductImageKind = "card" | "box-pack";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function normalizeProductImageZoom(value: unknown, fallback: ProductImageZoom = DEFAULT_PRODUCT_IMAGE_ZOOM): ProductImageZoom {
  const numeric = typeof value === "number" ? value : Number(value);
  return PRODUCT_IMAGE_ZOOM_OPTIONS.includes(numeric as ProductImageZoom) ? numeric as ProductImageZoom : fallback;
}

export function defaultProductImageZoom(kind: ProductImageKind): ProductImageZoom {
  return kind === "card" ? DEFAULT_CARD_PRODUCT_IMAGE_ZOOM : DEFAULT_BOX_PACK_PRODUCT_IMAGE_ZOOM;
}

export function productImageZoomStorageKey(kind: ProductImageKind): string {
  return kind === "card" ? PRODUCT_IMAGE_ZOOM_CARD_STORAGE_KEY : PRODUCT_IMAGE_ZOOM_BOX_PACK_STORAGE_KEY;
}

export function readProductImageZoom(kindOrStorage?: ProductImageKind | StorageLike, maybeStorage?: StorageLike): ProductImageZoom {
  const kind: ProductImageKind = typeof kindOrStorage === "string" ? kindOrStorage : "box-pack";
  const storage = typeof kindOrStorage === "string" ? maybeStorage : kindOrStorage;
  const fallback = defaultProductImageZoom(kind);
  if (!storage) return fallback;
  const stored = storage.getItem(productImageZoomStorageKey(kind));
  if (stored !== null) return normalizeProductImageZoom(stored, fallback);
  return normalizeProductImageZoom(storage.getItem(PRODUCT_IMAGE_ZOOM_STORAGE_KEY), fallback);
}

export function saveProductImageZoom(value: ProductImageZoom, kindOrStorage?: ProductImageKind | StorageLike, maybeStorage?: StorageLike) {
  const kind: ProductImageKind = typeof kindOrStorage === "string" ? kindOrStorage : "box-pack";
  const storage = typeof kindOrStorage === "string" ? maybeStorage : kindOrStorage;
  storage?.setItem(productImageZoomStorageKey(kind), String(normalizeProductImageZoom(value, defaultProductImageZoom(kind))));
}

export function normalizeCustomProductImageZoom(value: unknown, fallback = DEFAULT_PRODUCT_IMAGE_ZOOM): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(1.5, Math.max(1, Math.round(numeric * 100) / 100));
}

export function productImageZoomLabel(value: ProductImageZoom) {
  const zoom = normalizeProductImageZoom(value);
  if (zoom === 1) return "Mặc định (100%)";
  return `Phóng to ${Math.round(zoom * 100)}%`;
}

export function productImageScaleClass(value: ProductImageZoom) {
  return `scale-[${normalizeProductImageZoom(value)}]`;
}

export function productImageFrameClass() {
  return "flex aspect-square items-center justify-center overflow-hidden bg-white";
}

export function productImageFrameStyle() {
  return { backgroundColor: "#FFFFFF", isolation: "isolate" } as const;
}

export function productImageImageStyle(value: number, position: { x?: number; y?: number } = {}) {
  const x = Math.min(50, Math.max(-50, position.x ?? 0));
  const y = Math.min(50, Math.max(-50, position.y ?? 0));
  return {
    transform: `translate(${x}%, ${y}%) scale(${normalizeCustomProductImageZoom(value)})`,
    transformOrigin: "center",
    transition: "transform 280ms cubic-bezier(0.23, 1, 0.32, 1)",
    backgroundColor: "#FFFFFF",
  } as const;
}

export function productImageAlt(name: string, hasImage: boolean) {
  return hasImage ? name : `${name} — chưa có ảnh`;
}

export const PRODUCT_IMAGE_ZOOM_OPTIONS_WITH_LABELS = PRODUCT_IMAGE_ZOOM_OPTIONS.map((value) => ({
  value,
  label: productImageZoomLabel(value),
}));

export function readProductImageZoomFromWindow(kind: ProductImageKind = "box-pack") {
  return readProductImageZoom(kind, typeof window === "undefined" ? undefined : window.localStorage);
}

export function saveProductImageZoomToWindow(value: ProductImageZoom, kind: ProductImageKind = "box-pack") {
  saveProductImageZoom(value, kind, typeof window === "undefined" ? undefined : window.localStorage);
  if (typeof window !== "undefined") window.dispatchEvent(new Event(PRODUCT_IMAGE_ZOOM_CHANGED_EVENT));
}
