import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("theo dõi kiểm tra kết quả Chyusen", () => {
  it("giữ đếm ngày và cảnh báo quá hạn nhưng không hiển thị trạng thái kiểm tra", () => {
    const source = readFileSync(join(process.cwd(), "client/src/pages/Chyusen.tsx"), "utf8");

    expect(source).toContain("formatChyusenResultCountdown(entry.resultDate)");
    expect(source).toContain("isChyusenResultCheckOverdue(entry)");
    expect(source).toContain("Chưa kiểm tra kết quả");
    expect(source).not.toContain("markResultChecked.mutate({ id: entry.id })");
    expect(source).not.toContain("Đã kiểm tra lần gần nhất:");
  });
});
