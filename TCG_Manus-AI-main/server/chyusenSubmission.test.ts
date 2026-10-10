import { describe, expect, it } from "vitest";
import { EMPTY_CHYUSEN_DRAFT } from "../client/src/lib/chyusenDraft";
import { buildChyusenSubmission } from "../client/src/lib/chyusenSubmission";

describe("buildChyusenSubmission", () => {
  it("chuyển ngày dd/mm của bản ghi chỉnh sửa thành Date năm hiện tại theo JST", () => {
    const payload = buildChyusenSubmission({
      ...EMPTY_CHYUSEN_DRAFT,
      title: "Chỉnh sửa Chyusen", productName: "Pikachu Box", applicationEnd: "05/01",
    }, new Date("2027-01-02T10:00:00.000Z"));

    expect(payload.applicationEnd?.toISOString()).toBe("2027-01-04T15:00:00.000Z");
    expect(payload.sourceUrl).toBeUndefined();
  });

  it("báo lỗi nếu ngày submit không theo dạng dd/mm", () => {
    expect(() => buildChyusenSubmission({
      ...EMPTY_CHYUSEN_DRAFT,
      title: "Chỉnh sửa Chyusen", productName: "Pikachu Box", applicationEnd: "2027-01-05",
    })).toThrow("Hết hạn đăng ký phải có dạng ngày/tháng");
  });

  it("lưu ghi chú nhận hàng linh hoạt và luôn bỏ ngày nhận hàng kết thúc", () => {
    const payload = buildChyusenSubmission({
      ...EMPTY_CHYUSEN_DRAFT,
      title: "Chyusen", productName: "Pikachu Box", pickupStart: "03/09", pickupEnd: "10/09", pickupNote: "Khoảng đầu tháng 9",
    }, new Date("2026-08-13T10:00:00.000Z"));

    expect(payload.pickupStart?.toISOString()).toBe("2026-09-02T15:00:00.000Z");
    expect(payload.pickupEnd).toBeNull();
    expect(payload.pickupNote).toBe("Khoảng đầu tháng 9");
  });
});
