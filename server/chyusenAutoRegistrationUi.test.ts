import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("tự động đăng ký Chyusen khi lưu", () => {
  it("gửi trạng thái đã đăng ký cho mục mới và thông báo đang chờ kết quả", () => {
    const source = readFileSync(join(process.cwd(), "client/src/pages/Chyusen.tsx"), "utf8");

    expect(source).toContain('applicationStatus: "registered"');
    expect(source).toContain('resultStatus: "pending"');
    expect(source).toContain("Chyusen đang chờ kết quả");
  });
});
