import { describe, expect, it } from "vitest";
import { getChyusenAiFilledFields } from "../shared/chyusenAiFields";

describe("getChyusenAiFilledFields", () => {
  it("chỉ đánh dấu các trường thật sự được AI trích xuất", () => {
    expect(getChyusenAiFilledFields({ title: "Joshin 抽選", price: 5400, applicationEnd: "01/09", resultDate: null })).toEqual([
      "title", "price", "applicationEnd",
    ]);
  });
});
