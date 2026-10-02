import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const chyusenSource = readFileSync(join(process.cwd(), "client/src/pages/Chyusen.tsx"), "utf8");

describe("Chūsen purchase deadline after winning", () => {
  it("shows the entered purchase deadline only on won entries", () => {
    expect(chyusenSource).toContain('entry.applicationStatus === "won" && entry.pickupEnd');
    expect(chyusenSource).toContain("Hạn mua hàng");
    expect(chyusenSource).toContain("displayDate(entry.pickupEnd)");
  });

  it("shows the remaining days beside the purchase deadline with the existing deadline formatter", () => {
    expect(chyusenSource).toContain("formatChyusenDaysRemaining(entry.pickupEnd)");
    expect(chyusenSource).toContain("getChyusenDeadlineTone(entry.pickupEnd)");
    expect(chyusenSource).toContain("purchaseDeadlineRemaining");
  });

  it("provides a Tháng/Ngày input for an optional purchase deadline", () => {
    expect(chyusenSource).toContain('updateDraft("pickupEnd", formatChyusenDayMonthInput(event.target.value))');
    expect(chyusenSource).toContain('placeholder="Tháng/Ngày"');
  });
});
