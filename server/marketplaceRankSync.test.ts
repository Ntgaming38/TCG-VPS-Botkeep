import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

describe("Marketplace rank synchronization", () => {
  it("truyền Rank Card đã chuẩn hóa vào cùng luồng đồng bộ dùng cho thủ công và tự động", () => {
    const source = readFileSync(join(root, "server/db.ts"), "utf8");
    expect(source).toContain('normalizeCardRank(product.condition)');
    expect(source).toContain('fetchSnkrdunkPrice(product.snkrdunkUrl, product.type as "card" | "box" | "pack", cardRank)');
    expect(source).toContain('data.snkrdunkLastSyncedAt = null');
    expect(source).toContain("await syncSnkrdunkPriceForProduct(product.id, product.userId)");
    expect(source).toContain("processMarketplaceManualSyncBatch");
  });
});
