import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const chyusenPage = readFileSync(new URL("../client/src/pages/Chyusen.tsx", import.meta.url), "utf8");

describe("lựa chọn phân tích ảnh Chyusen", () => {
  it("hiển thị hai lựa chọn đọc ảnh và quét QR", () => {
    expect(chyusenPage).toContain("Đọc thông tin từ ảnh");
    expect(chyusenPage).toContain("Quét QR + đọc ảnh");
  });

  it("vẫn luôn gửi toàn bộ ảnh vào AI sau khi quét QR", () => {
    expect(chyusenPage).toContain('if (imageAnalysisMode === "qr")');
    expect(chyusenPage).toContain("runImageAnalysis(pendingQrAnalysis.imageDataUrls)");
    expect(chyusenPage).toContain("AI vẫn đang đọc đầy đủ nội dung ảnh");
  });
});
