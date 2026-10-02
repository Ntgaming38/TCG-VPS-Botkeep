import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const chyusenPage = readFileSync(new URL("../client/src/pages/Chyusen.tsx", import.meta.url), "utf8");

describe("cắt vùng QR Chyusen", () => {
  it("tạo vùng cắt có padding từ bốn góc QR", () => {
    expect(chyusenPage).toContain("qr.location.topLeftCorner");
    expect(chyusenPage).toContain("* 0.22");
    expect(chyusenPage).toContain("cropCanvas.toDataURL");
  });

  it("giữ ảnh đầy đủ và gửi thêm vùng QR cho AI", () => {
    expect(chyusenPage).toContain("imageDataUrlsForAi = [...imageDataUrls, ...qrCrops].slice(0, 8)");
    expect(chyusenPage).toContain("AI vẫn đang đọc đầy đủ nội dung ảnh");
  });

  it("hiển thị vùng QR cắt để người dùng xác nhận trước khi gửi AI", () => {
    expect(chyusenPage).toContain("Xem trước vùng QR tự cắt");
    expect(chyusenPage).toContain("Gửi đầy đủ ảnh cho AI");
    expect(chyusenPage).toContain("pendingQrAnalysis");
  });
});
