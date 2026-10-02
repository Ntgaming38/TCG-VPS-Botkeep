import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const chyusenPage = readFileSync(new URL("../client/src/pages/Chyusen.tsx", import.meta.url), "utf8");

describe("mở form Thêm Chyusen trên điện thoại", () => {
  it("không tự focus vào ô link website", () => {
    expect(chyusenPage).not.toContain("value={urlDraft} autoFocus");
    expect(chyusenPage).toContain("onOpenAutoFocus={(event) => event.preventDefault()}");
    expect(chyusenPage).toContain('value={draft.sourceUrl} onChange');
  });
});
