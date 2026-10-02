import { describe, expect, it } from "vitest";
import { EMPTY_CHYUSEN_DRAFT, toChyusenDraft } from "../client/src/lib/chyusenDraft";
import { buildChyusenSubmission } from "../client/src/lib/chyusenSubmission";
import { ADD_CUSTOM_CHYUSEN_SHOP_VALUE } from "../shared/chyusenShops";

describe("buildChyusenSubmission", () => {
  it("chuyển ngày Tháng/Ngày của bản ghi chỉnh sửa thành Date năm hiện tại theo JST", () => {
    const payload = buildChyusenSubmission({
      ...EMPTY_CHYUSEN_DRAFT,
      title: "Chỉnh sửa Chyusen", productName: "Pikachu Box", applicationEnd: "01/05",
    }, new Date("2027-01-02T10:00:00.000Z"));

    expect(payload.applicationEnd?.toISOString()).toBe("2027-01-04T15:00:00.000Z");
    expect(payload.sourceUrl).toBeUndefined();
  });

  it("báo lỗi nếu ngày submit không theo dạng Tháng/Ngày", () => {
    expect(() => buildChyusenSubmission({
      ...EMPTY_CHYUSEN_DRAFT,
      title: "Chỉnh sửa Chyusen", productName: "Pikachu Box", applicationEnd: "2027-01-05",
    })).toThrow("Hết hạn đăng ký phải có dạng Tháng/Ngày");
  });

  it("lưu ngày nhận hàng, hạn mua hàng và ghi chú nhận hàng linh hoạt", () => {
    const payload = buildChyusenSubmission({
      ...EMPTY_CHYUSEN_DRAFT,
      title: "Chyusen", productName: "Pikachu Box", pickupStart: "09/03", pickupEnd: "09/10", pickupNote: "Khoảng đầu tháng 9",
    }, new Date("2026-08-13T10:00:00.000Z"));

    expect(payload.pickupStart?.toISOString()).toBe("2026-09-02T15:00:00.000Z");
    expect(payload.pickupEnd?.toISOString()).toBe("2026-09-09T15:00:00.000Z");
    expect(payload.pickupNote).toBe("Khoảng đầu tháng 9");
  });

  it("chuẩn hóa tên cửa hàng nhập trực tiếp thành dữ liệu tùy chỉnh khi lưu", () => {
    const payload = buildChyusenSubmission({
      ...EMPTY_CHYUSEN_DRAFT,
      title: "Chyusen", productName: "Pikachu Box", shop: "  TCG Tokyo  ",
    });

    expect(payload.shop).toBe("Khác");
    expect(payload.customShopName).toBe("TCG Tokyo");
  });

  it("không gửi sourceContentHash null khi mở lại Chyusen cũ", () => {
    const draft = toChyusenDraft({ title: "Chyusen cũ", productName: "Pikachu Box", sourceContentHash: null });
    const payload = buildChyusenSubmission(draft);

    expect(draft.sourceContentHash).toBeUndefined();
    expect(payload.sourceContentHash).toBeUndefined();
  });
});
