import { describe, expect, it } from "vitest";
import { getActivityTone, getChangedFields, getSyncActivityDetails, isAutoSyncActivity } from "../client/src/pages/ActivityHistory";

describe("ActivityHistory detail changes", () => {
  it("chỉ trả về các trường thực sự thay đổi để hiển thị trong Lịch sử", () => {
    const changes = getChangedFields(
      JSON.stringify({ name: "Pikachu ex", quantity: 2, marketPrice: "12000" }),
      JSON.stringify({ name: "Pikachu ex", quantity: 3, marketPrice: "13000" }),
    );

    expect(changes).toEqual([
      { key: "quantity", before: 2, after: 3 },
      { key: "marketPrice", before: "12000", after: "13000" },
    ]);
  });

  it("xử lý an toàn dữ liệu nhật ký cũ không phải JSON", () => {
    expect(getChangedFields("nhật ký cũ", null)).toEqual([]);
  });

  it("ưu tiên màu xóa đỏ, sửa cam, mua xanh lá và bán vàng", () => {
    expect(getActivityTone("sale_deleted", "sale").badgeClass).toContain("rose");
    expect(getActivityTone("purchase_updated", "purchase").badgeClass).toContain("orange");
    expect(getActivityTone("purchase_created", "purchase").badgeClass).toContain("emerald");
    expect(getActivityTone("sale_created", "sale").badgeClass).toContain("yellow");
  });

  it("dùng nút nền màu với chữ đen cho nhãn thao tác cạnh tên sản phẩm", () => {
    expect(getActivityTone("sale_deleted", "sale").buttonClass).toContain("text-black");
    expect(getActivityTone("purchase_updated", "purchase").buttonClass).toContain("text-black");
    expect(getActivityTone("purchase_created", "purchase").buttonClass).toContain("text-black");
    expect(getActivityTone("sale_created", "sale").buttonClass).toContain("text-black");
  });

  it("nhận diện đồng bộ giá SNKRDUNK và Shop SNKR vào bộ lọc Đồng Bộ", () => {
    expect(isAutoSyncActivity("snkrdunk_price_synced")).toBe(true);
    expect(isAutoSyncActivity("snkr_shop_price_synced")).toBe(true);
    expect(isAutoSyncActivity("product_updated")).toBe(false);
    expect(isAutoSyncActivity("market_price_updated")).toBe(false);
  });

  it("phân biệt nguồn chạy và tóm tắt của đồng bộ Shop SNKR", () => {
    expect(getSyncActivityDetails("snkr_shop_auto_sync_completed", JSON.stringify({ syncMode: "auto", totalCount: 8, syncedCount: 7, failedCount: 1 }))).toEqual({
      isShopSnkr: true,
      syncMode: "auto",
      summary: { totalCount: 8, syncedCount: 7, failedCount: 1 },
    });
    expect(getSyncActivityDetails("snkr_shop_manual_price_synced", JSON.stringify({ syncMode: "manual", totalCount: 1, syncedCount: 1, failedCount: 0 })).syncMode).toBe("manual");
  });

  it("hiển thị nhãn phù hợp cho Chyusen đã khôi phục và đã chuyển Mua Hàng", () => {
    expect(getActivityTone("chyusen_restored", "chyusen").label).toBe("Đã khôi phục");
    expect(getActivityTone("chyusen_purchase_linked", "chyusen").label).toBe("Đã mua");
  });
});
