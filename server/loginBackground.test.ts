import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import { parseLoginBackgroundDataUrl } from "./loginBackground";

describe("login background upload validation", () => {
  it("chấp nhận ảnh PNG hợp lệ trong giới hạn dung lượng", () => {
    const encoded = Buffer.alloc(96, 3).toString("base64");
    const result = parseLoginBackgroundDataUrl(`data:image/png;base64,${encoded}`);
    expect(result.extension).toBe("png");
    expect(result.contentType).toBe("image/png");
    expect(result.data.length).toBe(96);
  });

  it("từ chối định dạng hoặc nội dung ảnh không hợp lệ", () => {
    expect(() => parseLoginBackgroundDataUrl("data:image/gif;base64,AAAA")).toThrow("PNG, JPEG hoặc WEBP");
  });
});
