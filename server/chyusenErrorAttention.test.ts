import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const chyusenPage = readFileSync(new URL("../client/src/pages/Chyusen.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");

describe("nhấn mạnh trường lỗi Chyusen", () => {
  it("gắn rồi gỡ lớp chú ý sau khi tự cuộn đến trường lỗi", () => {
    expect(chyusenPage).toContain('classList.add("chyusen-error-attention")');
    expect(chyusenPage).toContain('classList.remove("chyusen-error-attention")');
  });

  it("dùng viền đỏ, rung nhẹ và tôn trọng reduced motion", () => {
    expect(styles).toContain(".chyusen-error-attention");
    expect(styles).toContain("@keyframes chyusen-error-shake");
    expect(styles).toContain("prefers-reduced-motion: reduce");
  });
});
