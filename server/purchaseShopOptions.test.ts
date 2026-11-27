import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

function readClientFile(path: string): string {
  return readFileSync(new URL(`../client/src/${path}`, import.meta.url), "utf8");
}

const purchases = readClientFile("pages/Purchases.tsx");

describe("Danh sách shop mua hàng", () => {
  it("shop mặc định có Pokémon Center (nơi mua các box trúng Chyusen Pokémon Center)", () => {
    const defaultsLine = purchases.split("\n").find((line) => line.includes("const DEFAULT_SHOPS")) ?? "";
    expect(defaultsLine).toContain("Pokémon Center");
  });

  it("form sửa đơn mua dùng danh sách shop gộp và luôn giữ shop hiện tại của đơn", () => {
    expect(purchases).toContain("editShopOptions");
    // The current shop is prepended when it is not already an option, so a
    // legacy/custom shop stays visible and changeable instead of being stuck.
    expect(purchases).toContain("[editForm.shop, ...purchaseShopOptions]");
    // The edit dialog renders editShopOptions, not only the hard-coded defaults.
    expect(purchases).toContain("editShopOptions.map");
  });
});
