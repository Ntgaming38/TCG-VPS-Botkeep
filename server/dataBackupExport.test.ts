import { describe, expect, it } from "vitest";
import { createDataBackupPayload, getDataBackupFileName, rowsToCsv } from "@shared/dataBackupExport";

describe("data backup export", () => {
  it("chỉ đưa các nhóm dữ liệu được yêu cầu vào bản xuất", () => {
    const payload = createDataBackupPayload("sales", { inventory: [{ id: 1 }], sales: [{ id: 2 }], chyusen: { entries: [] } }, "2026-08-15T00:00:00.000Z");
    expect(payload.sales).toEqual([{ id: 2 }]);
    expect(payload.inventory).toBeUndefined();
    expect(payload.chyusen).toBeUndefined();
  });

  it("tạo CSV an toàn cho Excel và tên tệp theo nhóm", () => {
    expect(rowsToCsv([{ name: "Pikachu, \"SAR\"", quantity: 1 }])).toContain('"Pikachu, ""SAR"""');
    expect(getDataBackupFileName("inventory", "csv", new Date("2026-08-15T00:00:00.000Z"))).toBe("tcg-manager-inventory-2026-08-15.csv");
  });
});
