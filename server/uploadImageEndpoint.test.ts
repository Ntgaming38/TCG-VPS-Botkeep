import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "server/_core/index.ts"), "utf8");
const uploadBlock = source.slice(source.indexOf('"/api/upload-image"'));

describe("/api/upload-image endpoint guard", () => {
  it("yêu cầu đăng nhập trước khi lưu file", () => {
    expect(uploadBlock).toContain("sdk.authenticateRequest(req)");
    expect(uploadBlock).toContain('res.status(401)');
    // Cron sessions không được upload.
    expect(uploadBlock).toContain("user.isCron");
  });

  it("validate nội dung ảnh và dùng đuôi file đã chuẩn hoá cho storage key", () => {
    expect(uploadBlock).toContain("validateProductImageUpload");
    expect(uploadBlock).toContain("validated.ext");
    expect(uploadBlock).toContain("validated.contentType");
    // Không còn lấy đuôi file trực tiếp từ filename người dùng gửi.
    expect(uploadBlock).not.toContain('filename.split(".")');
  });
});
