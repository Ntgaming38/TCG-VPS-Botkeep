import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Marketplace sync error schema", () => {
  it("lưu URL lỗi theo tài khoản và có thời điểm xử lý", () => {
    const schema = readFileSync(join(process.cwd(), "drizzle/schema.ts"), "utf8");
    const db = readFileSync(join(process.cwd(), "server/db.ts"), "utf8");

    expect(schema).toContain('mysqlTable("marketplace_sync_errors"');
    expect(schema).toContain('resolvedAt: timestamp("resolvedAt")');
    expect(db).toContain("getMarketplaceSyncErrorHistory");
    expect(db).toContain("snkrdunk_price_sync_failed");
  });
});
