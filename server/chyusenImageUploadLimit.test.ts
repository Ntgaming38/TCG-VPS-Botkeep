import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const chyusenPage = readFileSync(new URL("../client/src/pages/Chyusen.tsx", import.meta.url), "utf8");
const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");

describe("giới hạn và nén ảnh Chyusen", () => {
  it("cho phép ảnh gốc tối đa 10 MB và tổng 40 MB trước khi nén", () => {
    expect(chyusenPage).toContain("10 * 1024 * 1024");
    expect(chyusenPage).toContain("40 * 1024 * 1024");
    expect(chyusenPage).toContain("tối đa 10 MB/ảnh và 40 MB tổng");
  });

  it("dùng các cấu hình nén thích ứng trước khi gửi AI", () => {
    expect(chyusenPage).toContain("compressionProfiles");
    expect(chyusenPage).toContain("preparedImage.length <= 2_600_000");
    expect(routerSource).toContain("max(3_500_000)");
  });
});
