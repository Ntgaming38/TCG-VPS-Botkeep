import { describe, expect, it } from "vitest";
import { serializeActivityChange } from "./db";

describe("serializeActivityChange", () => {
  it("lưu được snapshot dữ liệu trước và sau thay đổi", () => {
    const result = serializeActivityChange(
      { name: "Pikachu ex", quantity: 2, marketPrice: "12000" },
      { name: "Pikachu ex", quantity: 3, marketPrice: "13000" },
    );

    expect(JSON.parse(result.oldValue!)).toEqual({ name: "Pikachu ex", quantity: 2, marketPrice: "12000" });
    expect(JSON.parse(result.newValue!)).toEqual({ name: "Pikachu ex", quantity: 3, marketPrice: "13000" });
  });

  it("biểu diễn thao tác thêm hoặc xóa bằng snapshot rỗng ở phía tương ứng", () => {
    expect(serializeActivityChange(null, { id: 5 })).toEqual({ oldValue: null, newValue: '{"id":5}' });
    expect(serializeActivityChange({ id: 5 }, null)).toEqual({ oldValue: '{"id":5}', newValue: null });
  });
});
