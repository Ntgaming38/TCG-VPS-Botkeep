import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Thứ tự mặc định toàn app (yêu cầu của chủ app 2026-10-30):
// - Mọi danh sách sản phẩm: ngày mua gần nhất → xa nhất.
// - Chyusen: ngày có kết quả gần nhất → xa nhất.
describe("Thứ tự mặc định: sản phẩm theo ngày mua, Chyusen theo ngày kết quả", () => {
  const root = process.cwd();
  const read = (path: string) => readFileSync(join(root, path), "utf8");

  it("server/db.ts gắn latestPurchaseDate và sắp xếp cả ba danh sách sản phẩm bằng helper dùng chung", () => {
    const db = read("server/db.ts");
    expect(db).toContain("latestPurchaseDate");
    expect(db).toContain("sortProductsByRecentPurchase");
    // Định nghĩa helper + 3 điểm dùng: listProducts, getInStockProducts, getDamagedProducts.
    expect(db.match(/sortProductsByLatestPurchase/g)?.length).toBeGreaterThanOrEqual(4);
    // Không còn danh sách sản phẩm nào sắp xếp theo updatedAt.
    expect(db).not.toContain("orderBy(desc(products.updatedAt))");
  });

  it("chyusenDb sắp xếp cả danh sách quản lý và lịch sử kết quả theo resultDate giảm dần", () => {
    const chyusenDb = read("server/chyusenDb.ts");
    expect(chyusenDb.match(/desc\(chyusenEntries\.resultDate\)/g)?.length).toBe(2);
  });

  it("trang Lịch sử Chyusen cũng sắp xếp theo ngày kết quả phía client", () => {
    const history = read("client/src/pages/ChyusenHistory.tsx");
    expect(history).toContain("entry.resultDate ??");
  });
});
