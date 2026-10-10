import { describe, expect, it } from "vitest";
import { createChyusenSourceUpdatePayload } from "../shared/chyusenSourceUpdate";

describe("Chyusen Settings source update payload", () => {
  it("chuẩn hóa URL, nhãn, tần suất và trạng thái khi bấm Lưu", () => {
    expect(createChyusenSourceUpdatePayload(14, { label: "  Joshin mới ", sourceUrl: " https://joshinweb.jp/lottery ", checkIntervalMinutes: "180", isActive: false }))
      .toEqual({ id: 14, label: "Joshin mới", sourceUrl: "https://joshinweb.jp/lottery", checkIntervalMinutes: 180, isActive: false });
  });

  it("không tạo payload cập nhật nếu URL trống", () => {
    expect(() => createChyusenSourceUpdatePayload(14, { label: "Joshin", sourceUrl: "  ", checkIntervalMinutes: "360", isActive: true })).toThrow("URL nguồn không được để trống.");
  });
});
