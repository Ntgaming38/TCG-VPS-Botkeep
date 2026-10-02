import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("bộ lọc Chyusen chờ kết quả", () => {
  it("hiển thị một lựa chọn Chờ kết quả và dùng cùng quy tắc với chỉ số Tổng quan", () => {
    const source = readFileSync(join(process.cwd(), "client/src/pages/Chyusen.tsx"), "utf8");

    expect(source).toContain("CHYUSEN_STATUS_FILTER_OPTIONS.map");
    expect(source).toContain("statusFilterCounts[option.value]");
    expect(source).toContain("matchesChyusenStatusFilter(entry, filter)");
  });
});
