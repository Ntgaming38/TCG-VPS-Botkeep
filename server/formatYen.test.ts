import { describe, expect, it } from "vitest";
import { formatSignedYen, formatYen, readCurrencySymbolPosition, saveCurrencySymbolPosition } from "../shared/formatYen";

describe("formatYen", () => {
  it("đặt ký hiệu ¥ sau số tiền và dấu âm trước số tiền", () => {
    expect(formatYen(1000)).toBe("1,000 ¥");
    expect(formatYen(-1250)).toBe("- 1,250 ¥");
  });

  it("giữ dấu cộng hoặc âm đứng trước số tiền", () => {
    expect(formatSignedYen(8750)).toBe("+ 8,750 ¥");
    expect(formatSignedYen(-8750)).toBe("- 8,750 ¥");
  });

  it("hỗ trợ ký hiệu ¥ ở trước số tiền khi người dùng chọn trong Cài đặt", () => {
    expect(formatYen(1000, "ja-JP", "prefix")).toBe("¥ 1,000");
    expect(formatYen(-1250, "ja-JP", "prefix")).toBe("¥ -1,250");
    expect(formatSignedYen(8750, "ja-JP", "prefix")).toBe("+¥ 8,750");
  });

  it("đọc và lưu lựa chọn vị trí ký hiệu tiền tệ", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) };
    expect(readCurrencySymbolPosition(storage)).toBe("suffix");
    saveCurrencySymbolPosition("prefix", storage);
    expect(readCurrencySymbolPosition(storage)).toBe("prefix");
  });

  it("dùng giá trị an toàn khi đầu vào không hợp lệ", () => {
    expect(formatYen(Number.NaN)).toBe("0 ¥");
  });
});
