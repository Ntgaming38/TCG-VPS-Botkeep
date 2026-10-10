import { describe, expect, it } from "vitest";
import { validateChyusenManualDraft } from "../shared/chyusenManualValidation";

describe("validateChyusenManualDraft", () => {
  it("yêu cầu tên, hạn đăng ký và ngày công bố khi lưu thủ công", () => {
    expect(validateChyusenManualDraft({ title: "", productName: "", applicationEnd: "", resultDate: "" })).toMatchObject({
      title: expect.any(String), productName: expect.any(String), applicationEnd: expect.any(String), resultDate: expect.any(String),
    });
  });

  it("chấp nhận bản nháp đủ các dữ liệu bắt buộc", () => {
    expect(validateChyusenManualDraft({ title: "Joshin 抽選", productName: "Pikachu Box", applicationEnd: "2026-09-01T10:00", resultDate: "2026-09-05T12:00" })).toEqual({});
  });
});
