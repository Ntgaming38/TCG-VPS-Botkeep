import { describe, expect, it } from "vitest";
import { dataBackupRestoreSchema, getDataBackupRestorePreview } from "@shared/dataBackupRestore";

describe("data backup restore", () => {
  it("chấp nhận bản sao lưu đúng phiên bản và tính số mục để xác nhận", () => {
    const payload = dataBackupRestoreSchema.parse({ formatVersion: "1.0", exportedAt: "2026-08-15T00:00:00.000Z", scope: "all", inventory: [{ id: 1 }], purchases: [{ id: 2 }], sales: [], chyusen: { entries: [{ id: 3 }] } });
    expect(getDataBackupRestorePreview(payload)).toMatchObject({ inventoryCount: 1, purchaseCount: 1, saleCount: 0, chyusenCount: 1 });
  });

  it("từ chối bản sao lưu không đúng phiên bản", () => {
    expect(() => dataBackupRestoreSchema.parse({ formatVersion: "2.0", exportedAt: "now", scope: "all" })).toThrow();
  });
});
