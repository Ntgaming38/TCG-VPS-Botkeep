import { describe, expect, it } from "vitest";
import { INVENTORY_STATUS_ORDER, sortInventoryByStatus } from "@shared/inventoryStatusOrder";

describe("inventory status order", () => {
  it("đặt thứ tự Tất cả là Trong kho, Đang giữ, Đã bán, Đã đổi, Hỏng/Rác", () => {
    expect(INVENTORY_STATUS_ORDER).toEqual(["in_stock", "reserved", "sold", "traded", "damaged"]);
    const products = [
      { id: 1, status: "damaged" }, { id: 2, status: "sold" }, { id: 3, status: "in_stock" },
      { id: 4, status: "reserved" }, { id: 5, status: "traded" },
    ];
    expect(sortInventoryByStatus(products).map((product) => product.id)).toEqual([3, 4, 2, 5, 1]);
  });

  it("giữ thứ tự gốc giữa các sản phẩm có cùng trạng thái", () => {
    const products = [{ id: 9, status: "in_stock" }, { id: 10, status: "in_stock" }, { id: 11, status: "sold" }];
    expect(sortInventoryByStatus(products).map((product) => product.id)).toEqual([9, 10, 11]);
  });
});
