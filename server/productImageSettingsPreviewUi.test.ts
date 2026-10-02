import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const settingsSource = readFileSync(join(process.cwd(), "client/src/pages/Settings.tsx"), "utf8");
const displaySource = readFileSync(join(process.cwd(), "client/src/lib/productImageDisplay.ts"), "utf8");

describe("Product image zoom previews in settings", () => {
  it("renders live Card and Box/Pack preview images", () => {
    expect(settingsSource).toContain("Xem trước zoom ảnh Card dọc");
    expect(settingsSource).toContain("Xem trước zoom ảnh Box/Pack ngang");
    expect(settingsSource).toContain("src={FALLBACK_PRODUCT_IMAGE_URL}");
  });

  it("binds each preview transform to its selected zoom value", () => {
    expect(settingsSource).toContain("style={productImageImageStyle(cardImageZoom)}");
    expect(settingsSource).toContain("style={productImageImageStyle(boxPackImageZoom)}");
    expect(displaySource).toContain('transition: "transform 280ms cubic-bezier(0.23, 1, 0.32, 1)"');
  });
});
