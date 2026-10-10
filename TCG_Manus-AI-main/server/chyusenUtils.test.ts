import { describe, expect, it } from "vitest";
import {
  detectProductType,
  extractExplicitTokyoDates,
  getChyusenTimeState,
  getChyusenUrgency,
  validatePublicChyusenUrl,
} from "./chyusenUtils";

describe("chyusen URL and schedule helpers", () => {
  it("chỉ chấp nhận nguồn công khai được hỗ trợ hoặc X chính thức", () => {
    expect(validatePublicChyusenUrl("https://joshinweb.jp/game/lottery").valid).toBe(true);
    expect(validatePublicChyusenUrl("https://x.com/p_bandai/status/12345").valid).toBe(true);
    expect(validatePublicChyusenUrl("https://example.com/lottery").valid).toBe(false);
    expect(validatePublicChyusenUrl("https://x.com/random/status/12345").valid).toBe(false);
  });

  it("chỉ nhận ngày giờ đầy đủ theo múi giờ Nhật", () => {
    const dates = extractExplicitTokyoDates("応募期間 2026年8月10日 10:00 ～ 2026/08/15 23:59。8月18日 20:00");
    expect(dates).toHaveLength(2);
    expect(dates[0].toISOString()).toBe("2026-08-10T01:00:00.000Z");
  });

  it("xếp trạng thái và mức cảnh báo theo deadline", () => {
    const now = new Date("2026-08-10T00:00:00.000Z");
    const deadline = new Date("2026-08-10T02:00:00.000Z");
    expect(getChyusenUrgency(deadline, now)).toBe("deadline_3h");
    expect(getChyusenTimeState({ applicationEnd: deadline }, now)).toBe("expiring");
  });

  it("nhận dạng loại sản phẩm từ từ khóa Nhật", () => {
    expect(detectProductType("拡張パック BOX")).toBe("box");
    expect(detectProductType("カード抽選")).toBe("card");
  });
});
