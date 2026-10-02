import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const chyusenPage = readFileSync(new URL("../client/src/pages/Chyusen.tsx", import.meta.url), "utf8");

describe("trang Chyusen gọn hơn", () => {
  it("không còn hiển thị thẻ Cài đặt Chyusen trùng với trang Cài đặt", () => {
    expect(chyusenPage).not.toContain("Cài đặt Chyusen");
    expect(chyusenPage).not.toContain("Settings2");
  });
});
