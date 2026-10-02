import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const adjusterSource = readFileSync(join(process.cwd(), "client/src/components/ProductImageAdjuster.tsx"), "utf8");
const hookSource = readFileSync(join(process.cwd(), "client/src/hooks/useProductImageZoom.ts"), "utf8");

describe("Product image settings zoom sync", () => {
  it("reads the settings zoom by product kind", () => {
    expect(adjusterSource).toContain('import { useProductImageZoom } from "@/hooks/useProductImageZoom";');
    expect(adjusterSource).toContain("const settingsZoom = useProductImageZoom(kind);");
    expect(adjusterSource).toContain("settingsZoom");
  });

  it("keeps a non-default per-image zoom while using settings for default images", () => {
    expect(adjusterSource).toContain("const hasCustomZoom = initialZoom !== null");
    expect(adjusterSource).toContain("nextHasCustomZoom ? initialZoom : settingsZoom");
    expect(hookSource).toContain('window.addEventListener(PRODUCT_IMAGE_ZOOM_CHANGED_EVENT, syncZoom);');
  });
});
