import { useEffect, useState } from "react";
import { FALLBACK_PRODUCT_IMAGE_URL } from "@/const";
import { trpc } from "@/lib/trpc";
import { useProductImageZoom } from "@/hooks/useProductImageZoom";
import { normalizeCustomProductImageZoom, productImageFrameStyle, productImageImageStyle, type ProductImageKind } from "@/lib/productImageDisplay";

const DEFAULT_ZOOM = 1.12;

type ProductImageAdjusterProps = {
  entity: "product" | "snkr";
  id: number;
  kind: ProductImageKind;
  src: string | null | undefined;
  alt: string;
  initialZoom?: number | string | null;
  initialPositionX?: number | string | null;
  initialPositionY?: number | string | null;
  className?: string;
  eager?: boolean;
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
};

function normalizePosition(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? Math.min(50, Math.max(-50, numeric)) : 0;
}

export function ProductImageAdjuster({ entity, id, kind, src, alt, initialZoom, initialPositionX, initialPositionY, className = "", eager = false, referrerPolicy }: ProductImageAdjusterProps) {
  const settingsZoom = useProductImageZoom(kind);
  const hasCustomZoom = initialZoom !== null && initialZoom !== undefined && Number.isFinite(Number(initialZoom)) && Number(initialZoom) !== DEFAULT_ZOOM;
  const effectiveInitialZoom = hasCustomZoom ? initialZoom : settingsZoom;
  const [zoom, setZoom] = useState(() => normalizeCustomProductImageZoom(effectiveInitialZoom, settingsZoom));
  const [position, setPosition] = useState(() => ({ x: normalizePosition(initialPositionX), y: normalizePosition(initialPositionY) }));
  const [failed, setFailed] = useState(false);
  const productZoom = trpc.products.updateImageZoom.useMutation();
  const snkrZoom = trpc.snkrShop.updateImageZoom.useMutation();

  useEffect(() => {
    const nextHasCustomZoom = initialZoom !== null && initialZoom !== undefined && Number.isFinite(Number(initialZoom)) && Number(initialZoom) !== DEFAULT_ZOOM;
    setZoom(normalizeCustomProductImageZoom(nextHasCustomZoom ? initialZoom : settingsZoom, settingsZoom));
    setPosition({ x: normalizePosition(initialPositionX), y: normalizePosition(initialPositionY) });
    setFailed(false);
  }, [initialZoom, initialPositionX, initialPositionY, src, settingsZoom]);

  const imageUrl = src && !failed ? src : FALLBACK_PRODUCT_IMAGE_URL;
  const isSaving = productZoom.isPending || snkrZoom.isPending;
  // Zoom and position are edited only from the Sửa form; the gallery image itself is read-only.
  return <div className={`relative flex aspect-square min-h-0 items-center justify-center overflow-hidden bg-white ${className}`} style={productImageFrameStyle()} onClick={(event) => event.stopPropagation()}>
    <img src={imageUrl} alt={alt} className="h-full w-full select-none bg-white object-contain transition-transform duration-300 motion-reduce:transition-none" style={productImageImageStyle(zoom, position)} loading={eager ? "eager" : "lazy"} referrerPolicy={referrerPolicy} draggable={false} onError={(event) => { event.currentTarget.onerror = null; setFailed(true); }} />
    {isSaving && <span className="pointer-events-none absolute right-2 top-2 rounded bg-slate-950/75 px-1.5 py-0.5 text-[9px] font-semibold text-white">Đang lưu…</span>}
  </div>;
}

export const PRODUCT_IMAGE_DEFAULT_ZOOM = DEFAULT_ZOOM;
