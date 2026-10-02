import { describe, expect, it } from "vitest";
import { parseAvatarDataUrl } from "./userProfile";

describe("user profile avatar", () => {
  it("nhận ảnh PNG, JPEG, WEBP dưới giới hạn 3 MB", () => {
    const dataUrl = `data:image/png;base64,${Buffer.from("a".repeat(128)).toString("base64")}`;
    expect(parseAvatarDataUrl(dataUrl)).toMatchObject({ extension: "png", contentType: "image/png" });
  });

  it("từ chối định dạng hoặc kích thước ảnh đại diện không hợp lệ", () => {
    expect(() => parseAvatarDataUrl("data:image/gif;base64,AAAA")).toThrow("Ảnh đại diện không hợp lệ");
    expect(() => parseAvatarDataUrl(`data:image/jpeg;base64,${Buffer.from("x").toString("base64")}`)).toThrow("3 MB");
  });
});
