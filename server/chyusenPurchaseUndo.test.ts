import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const routers = read("server/routers.ts");
const chyusenDb = read("server/chyusenDb.ts");
const historyPage = read("client/src/pages/ChyusenHistory.tsx");

describe("Hoàn tác xác nhận mua hàng từ Chyusen", () => {
  it("router có mutation hoàn tác riêng và chặn xác nhận mua khi Chyusen chưa trúng", () => {
    expect(routers).toContain("undoPurchaseCreated: protectedProcedure");
    expect(routers).toContain("undoChyusenPurchaseCreated");
    expect(routers).toContain("Chỉ Chyusen đã trúng mới có thể xác nhận mua hàng.");
  });

  it("tầng dữ liệu xóa dấu đã mua, khôi phục khỏi thùng rác và ghi lại nhật ký", () => {
    expect(chyusenDb).toContain("export async function undoChyusenPurchaseCreated");
    expect(chyusenDb).toContain("purchaseCreatedAt: null");
    expect(chyusenDb).toContain("chyusen_purchase_unlinked");
    expect(chyusenDb).toContain("markLatestTrashItemRestored");
  });

  it("trang Lịch sử có nút hoàn tác kèm hộp thoại xác nhận cho hồ sơ đã chuyển Mua Hàng", () => {
    expect(historyPage).toContain("Hoàn tác Đã mua hàng");
    expect(historyPage).toContain("undoPurchaseCreated.mutate({ id: undoPurchaseEntry.id })");
    expect(historyPage).toContain("entry.purchaseCreatedAt &&");
  });
});
