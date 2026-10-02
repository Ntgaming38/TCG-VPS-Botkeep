import { describe, expect, it } from "vitest";
import { findMatchingPurchaseInventoryLot, getPurchaseUnitPrice } from "../shared/purchaseInventoryLot";

describe("purchase inventory lots", () => {
  const lots = [
    { id: 1, type: "box", buyPrice: "6200" },
    { id: 2, type: "box", buyPrice: "7200" },
    { id: 3, type: "pack", buyPrice: "6200" },
    { id: 4, type: "junk_pack", buyPrice: "480" },
  ];

  it("derives the whole-JPY per-item buy price from one lot total", () => {
    expect(getPurchaseUnitPrice(6200, 1)).toBe(6200);
    expect(getPurchaseUnitPrice(6240, 13)).toBe(480);
  });

  it("selects only a lot with the same product type and unit price", () => {
    expect(findMatchingPurchaseInventoryLot(lots, "box", 6200)?.id).toBe(1);
    expect(findMatchingPurchaseInventoryLot(lots, "box", 7200)?.id).toBe(2);
    expect(findMatchingPurchaseInventoryLot(lots, "pack", 6200)?.id).toBe(3);
    expect(findMatchingPurchaseInventoryLot(lots, "box", 480)).toBeUndefined();
  });
});
