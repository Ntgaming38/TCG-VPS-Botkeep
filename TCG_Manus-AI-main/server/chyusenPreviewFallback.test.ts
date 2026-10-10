import { describe, expect, it } from "vitest";
import { createChyusenPreviewFallback } from "../shared/chyusenPreview";

describe("Chyusen preview fallback", () => {
  it("xóa URL không đọc được nhưng giữ nguyên dữ liệu đã nhập tay", () => {
    const fallback = createChyusenPreviewFallback({
      title: "抽選 thủ công",
      productName: "Pikachu Box",
      sourceUrl: "https://unavailable.example.jp/lottery",
      parserStatus: "manual" as const,
      parserNote: "",
    });

    expect(fallback).toMatchObject({
      title: "抽選 thủ công",
      productName: "Pikachu Box",
      sourceUrl: "",
      parserStatus: "unavailable",
    });
    expect(fallback.parserNote).toContain("nhập thông tin thủ công");
  });
});
