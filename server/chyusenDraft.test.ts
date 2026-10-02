import { describe, expect, it } from "vitest";
import { toChyusenDraft } from "../client/src/lib/chyusenDraft";

describe("toChyusenDraft", () => {
  it("tạo bản nháp tự điền từ phản hồi link hợp lệ", () => {
    const draft = toChyusenDraft({
      title: "Joshin 抽選", productName: "Pikachu Box", shop: "Joshin", sourceUrl: "https://joshinweb.jp/game/lottery", price: "5400",
      parserStatus: "detected", parserNote: "Đã nhận diện", fieldConfidence: { productName: "detected" },
    });

    expect(draft).toMatchObject({
      title: "Joshin 抽選", productName: "Pikachu Box", shop: "Joshin", sourceUrl: "https://joshinweb.jp/game/lottery",
      price: "5400", parserStatus: "detected", parserNote: "Đã nhận diện",
    });
  });

  it("chuyển ngày của bản ghi đang sửa thành Tháng/Ngày, không kèm năm hoặc giờ", () => {
    const draft = toChyusenDraft({
      title: "Bản ghi cũ", productName: "Eevee Box",
      applicationStart: "2026-12-07T03:00:00.000Z", applicationEnd: "2026-12-12T03:00:00.000Z",
    });

    expect(draft.applicationStart).toBe("12/07");
    expect(draft.applicationEnd).toBe("12/12");
  });
});
