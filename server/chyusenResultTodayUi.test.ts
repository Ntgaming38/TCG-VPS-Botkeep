import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("huy hiệu kết quả Chyusen hôm nay", () => {
  it("hiển thị huy hiệu Hôm nay và bộ chọn thứ tự công bố gần nhất", () => {
    const source = readFileSync(join(process.cwd(), "client/src/pages/Chyusen.tsx"), "utf8");

    expect(source).toContain("const resultToday = isChyusenResultAnnouncementToday(entry)");
    expect(source).toContain(">Hôm nay</Badge>");
    expect(source).toContain('value="resultDate">Công bố gần nhất');
    expect(source).toContain('useState<"deadline" | "resultDate">("resultDate")');
    expect(source).toContain('sortChyusenByNearestResultDate(matchingEntries)');
  });
});
