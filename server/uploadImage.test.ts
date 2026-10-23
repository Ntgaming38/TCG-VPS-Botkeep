import { describe, expect, it } from "vitest";
import { MAX_PRODUCT_IMAGE_BYTES, validateProductImageUpload } from "./uploadImage";

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(16),
]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(16)]);
const GIF = Buffer.concat([Buffer.from("GIF89a", "ascii"), Buffer.alloc(16)]);
const WEBP = Buffer.concat([
  Buffer.from("RIFF", "ascii"),
  Buffer.alloc(4),
  Buffer.from("WEBP", "ascii"),
  Buffer.alloc(8),
]);

describe("validateProductImageUpload", () => {
  it("chấp nhận ảnh thật và chuẩn hoá đuôi + Content-Type", () => {
    expect(validateProductImageUpload({ filename: "card.PNG", contentType: "image/png", buffer: PNG })).toEqual({
      ext: "png",
      contentType: "image/png",
    });
    expect(validateProductImageUpload({ filename: "photo.jpeg", contentType: "image/jpeg", buffer: JPEG })).toEqual({
      ext: "jpg",
      contentType: "image/jpeg",
    });
    expect(validateProductImageUpload({ filename: "anim.gif", contentType: "image/gif", buffer: GIF }).ext).toBe("gif");
    expect(validateProductImageUpload({ filename: "pic.webp", contentType: "image/webp", buffer: WEBP }).ext).toBe("webp");
  });

  it("từ chối SVG và các đuôi file không phải ảnh raster", () => {
    expect(() =>
      validateProductImageUpload({ filename: "x.svg", contentType: "image/svg+xml", buffer: Buffer.from("<svg onload=alert(1)>") })
    ).toThrow();
    expect(() =>
      validateProductImageUpload({ filename: "shell.php", contentType: "image/png", buffer: PNG })
    ).toThrow();
    expect(() =>
      validateProductImageUpload({ filename: "evil.png.html", contentType: "text/html", buffer: PNG })
    ).toThrow();
  });

  it("từ chối khi nội dung không khớp loại file khai báo (magic bytes)", () => {
    // Đổi tên file text/exe thành .png vẫn bị chặn.
    expect(() =>
      validateProductImageUpload({ filename: "fake.png", contentType: "image/png", buffer: Buffer.from("MZ not an image at all") })
    ).toThrow();
    // Ảnh JPEG nhưng khai là PNG cũng bị chặn.
    expect(() =>
      validateProductImageUpload({ filename: "fake.png", contentType: "image/png", buffer: JPEG })
    ).toThrow();
  });

  it("từ chối khi Content-Type không khớp đuôi file", () => {
    expect(() =>
      validateProductImageUpload({ filename: "card.png", contentType: "image/jpeg", buffer: PNG })
    ).toThrow();
  });

  it("từ chối file rỗng và file vượt giới hạn kích thước", () => {
    expect(() =>
      validateProductImageUpload({ filename: "a.png", contentType: "image/png", buffer: Buffer.alloc(0) })
    ).toThrow();
    const oversized = Buffer.concat([PNG, Buffer.alloc(MAX_PRODUCT_IMAGE_BYTES)]);
    expect(() =>
      validateProductImageUpload({ filename: "a.png", contentType: "image/png", buffer: oversized })
    ).toThrow();
  });

  it("bỏ qua thư mục trong filename, không cho path traversal qua tên file", () => {
    expect(
      validateProductImageUpload({ filename: "../../card.png", contentType: "image/png", buffer: PNG }).ext
    ).toBe("png");
  });
});
