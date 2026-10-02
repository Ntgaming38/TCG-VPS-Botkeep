import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("trạng thái ghim địa điểm giao dịch", () => {
  it("lưu isPinned cho cả cửa hàng mua và nơi bán", () => {
    const schema = readFileSync(join(process.cwd(), "drizzle/schema.ts"), "utf8");
    const migration = readFileSync(join(process.cwd(), "drizzle/0031_funny_mimic.sql"), "utf8");
    expect(schema).toContain('isPinned: int("isPinned")');
    expect(migration).toContain("ALTER TABLE `shops` ADD `isPinned`");
    expect(migration).toContain("ALTER TABLE `sale_locations` ADD `isPinned`");
  });
});
