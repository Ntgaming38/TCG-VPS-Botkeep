import { describe, expect, it } from "vitest";
import {
  DEFAULT_BOX_PACK_PRODUCT_IMAGE_ZOOM,
  DEFAULT_CARD_PRODUCT_IMAGE_ZOOM,
  DEFAULT_PRODUCT_IMAGE_ZOOM,
  PRODUCT_IMAGE_ZOOM_OPTIONS,
  productImageFrameStyle,
  productImageImageStyle,
  productImageZoomLabel,
  productImageZoomStorageKey,
  normalizeProductImageZoom,
  readProductImageZoom,
  saveProductImageZoom,
} from "../client/src/lib/productImageDisplay";

function createStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}

describe("product image display settings", () => {
  it("uses the approved defaults for both product orientations", () => {
    expect(DEFAULT_PRODUCT_IMAGE_ZOOM).toBe(1.12);
    expect(DEFAULT_CARD_PRODUCT_IMAGE_ZOOM).toBe(1.12);
    expect(DEFAULT_BOX_PACK_PRODUCT_IMAGE_ZOOM).toBe(1.12);
    expect(PRODUCT_IMAGE_ZOOM_OPTIONS).toContain(DEFAULT_CARD_PRODUCT_IMAGE_ZOOM);
    expect(PRODUCT_IMAGE_ZOOM_OPTIONS).toContain(DEFAULT_BOX_PACK_PRODUCT_IMAGE_ZOOM);
  });

  it("stores Card and Box/Pack zoom independently", () => {
    const storage = createStorage();
    saveProductImageZoom(1.24, "card", storage);
    saveProductImageZoom(1.06, "box-pack", storage);
    expect(productImageZoomStorageKey("card")).not.toBe(productImageZoomStorageKey("box-pack"));
    expect(readProductImageZoom("card", storage)).toBe(1.24);
    expect(readProductImageZoom("box-pack", storage)).toBe(1.06);
  });

  it("falls back to the legacy zoom value for existing devices", () => {
    const storage = createStorage({ "tcg-product-image-zoom": "1.18" });
    expect(readProductImageZoom("card", storage)).toBe(1.18);
    expect(readProductImageZoom("box-pack", storage)).toBe(1.18);
  });

  it("normalizes unsupported values to the default", () => {
    expect(normalizeProductImageZoom(1.18)).toBe(1.18);
    expect(normalizeProductImageZoom("1.19")).toBe(DEFAULT_PRODUCT_IMAGE_ZOOM);
    expect(normalizeProductImageZoom(null)).toBe(DEFAULT_PRODUCT_IMAGE_ZOOM);
  });

  it("keeps the setting label in Vietnamese", () => {
    expect(productImageZoomLabel(1.24)).toContain("Phóng to 124%");
  });

  it("keeps a white full frame and smooth transform style", () => {
    expect(productImageFrameStyle()).toMatchObject({ backgroundColor: "#FFFFFF", isolation: "isolate" });
    expect(productImageImageStyle(1.18)).toMatchObject({
      transform: "translate(0%, 0%) scale(1.18)",
      transformOrigin: "center",
      transition: expect.stringContaining("transform"),
      backgroundColor: "#FFFFFF",
    });
  });
});


describe("custom per-image zoom", () => {
  it("accepts continuous per-image zoom values and clamps the safe range", async () => {
    const { normalizeCustomProductImageZoom } = await import("../client/src/lib/productImageDisplay");
    expect(normalizeCustomProductImageZoom(1.01)).toBe(1.01);
    expect(normalizeCustomProductImageZoom("1.37")).toBe(1.37);
    expect(normalizeCustomProductImageZoom(0.4)).toBe(1);
    expect(normalizeCustomProductImageZoom(2)).toBe(1.5);
  });
});
