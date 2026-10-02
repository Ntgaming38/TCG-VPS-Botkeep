import { useEffect, useState } from "react";
import {
  PRODUCT_IMAGE_ZOOM_CHANGED_EVENT,
  readProductImageZoomFromWindow,
  type ProductImageKind,
  type ProductImageZoom,
} from "@/lib/productImageDisplay";

export function useProductImageZoom(kind: ProductImageKind = "box-pack"): ProductImageZoom {
  const [zoom, setZoom] = useState<ProductImageZoom>(() => readProductImageZoomFromWindow(kind));

  useEffect(() => {
    const syncZoom = () => setZoom(readProductImageZoomFromWindow(kind));
    window.addEventListener("storage", syncZoom);
    window.addEventListener(PRODUCT_IMAGE_ZOOM_CHANGED_EVENT, syncZoom);
    return () => {
      window.removeEventListener("storage", syncZoom);
      window.removeEventListener(PRODUCT_IMAGE_ZOOM_CHANGED_EVENT, syncZoom);
    };
  }, [kind]);

  return zoom;
}
