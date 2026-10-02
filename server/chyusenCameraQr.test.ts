import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const chyusenPage = readFileSync(new URL("../client/src/pages/Chyusen.tsx", import.meta.url), "utf8");

describe("quét QR từ camera Chyusen", () => {
  it("chỉ mở camera sau thao tác người dùng và ưu tiên camera sau", () => {
    expect(chyusenPage).toContain("Quét QR từ camera");
    expect(chyusenPage).toContain('facingMode: { ideal: "environment" }');
    expect(chyusenPage).toContain("navigator.mediaDevices?.getUserMedia");
  });

  it("dừng các track camera khi đóng hoặc quét xong", () => {
    expect(chyusenPage).toContain("getTracks().forEach((track) => track.stop())");
    expect(chyusenPage).toContain("stopCameraQrScanner()");
    expect(chyusenPage).toContain("setShowQrPreview(true)");
  });
});
