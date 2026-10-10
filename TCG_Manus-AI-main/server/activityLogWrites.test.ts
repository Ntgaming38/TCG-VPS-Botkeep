import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  selectResponses: [] as any[][],
  insertValues: [] as any[],
  nextId: 1,
  db: {} as any,
}));

function mockSelectResult() {
  const response = state.selectResponses.shift() || [];
  const query = {
    limit: vi.fn(async () => response),
    then: (resolve: (value: any[]) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(response).then(resolve, reject),
  };
  return { ...query, orderBy: vi.fn(() => query) };
}

state.db = {
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => mockSelectResult()),
    })),
  })),
  insert: vi.fn(() => ({
    values: vi.fn(async (value) => {
      state.insertValues.push(value);
      return [{ insertId: state.nextId++ }];
    }),
  })),
  update: vi.fn(() => ({
    set: vi.fn(() => ({ where: vi.fn(async () => undefined) })),
  })),
  delete: vi.fn(() => ({ where: vi.fn(async () => undefined) })),
};

vi.mock("drizzle-orm/mysql2", () => ({ drizzle: vi.fn(() => state.db) }));

import {
  createProduct, createPurchase, createSale, deleteProduct, deletePurchase, deleteSale,
  listActivityLogs, updateProduct, updatePurchase, updateSale,
} from "./db";

const product = {
  id: 8, userId: 1, name: "Pikachu ex", type: "card" as const, series: "Pokemon", setName: null,
  image: null, description: null, cardNumber: null, language: "Japanese", rarity: null, condition: "New",
  psaGrade: null, releaseDate: null, quantity: 4, damagedQuantity: 0, damageNote: null, buyPrice: "10000",
  marketPrice: "12000", snkrdunkUrl: null, snkrdunkLastSyncedAt: null, sellPrice: "0", status: "in_stock" as const,
  createdAt: new Date("2026-08-13T00:00:00.000Z"), updatedAt: new Date("2026-08-13T00:00:00.000Z"),
};

const purchase = {
  id: 31, userId: 1, productId: product.id, shop: "Pokemon Center", purchaseType: "mua_le" as const,
  quantity: 2, price: "9000", totalPrice: "18000", note: "Đợt đầu", image: null,
  status: "received" as const, purchaseDate: new Date("2026-08-12T00:00:00.000Z"), createdAt: new Date("2026-08-12T00:00:00.000Z"),
};

const sale = {
  id: 41, userId: 1, productId: product.id, quantity: 2, salePrice: "15000", totalRevenue: "30000",
  platform: "mercari" as const, fee: "0", shippingFee: "0", otherCost: "0", profit: "10000", note: "Đợt đầu",
  image: null, saleDate: new Date("2026-08-12T00:00:00.000Z"), createdAt: new Date("2026-08-12T00:00:00.000Z"),
};

function latestActivity(action: string) {
  return state.insertValues.filter((value) => value.action === action).at(-1);
}

describe("activity log writes", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "mysql://mock";
    state.selectResponses = [];
    state.insertValues = [];
    state.nextId = 1;
    vi.clearAllMocks();
  });

  it("ghi snapshot cho thao tác thêm, sửa và xóa sản phẩm", async () => {
    await createProduct({ userId: 1, name: "Mew ex", type: "card", quantity: 1, buyPrice: "5000", status: "in_stock" });
    expect(JSON.parse(latestActivity("product_created").newValue)).toMatchObject({ name: "Mew ex", quantity: 1 });

    state.selectResponses = [[product]];
    await updateProduct(product.id, 1, { quantity: 3 });
    const updateLog = latestActivity("product_updated");
    expect(JSON.parse(updateLog.oldValue)).toMatchObject({ quantity: 4 });
    expect(JSON.parse(updateLog.newValue)).toMatchObject({ quantity: 3 });

    state.selectResponses = [[product]];
    await deleteProduct(product.id, 1);
    const deleteLog = latestActivity("product_deleted");
    expect(JSON.parse(deleteLog.oldValue)).toMatchObject({ name: "Pikachu ex", quantity: 4 });
    expect(deleteLog.newValue).toBeNull();
  });

  it("ghi snapshot cho thao tác tạo giao dịch mua và bán", async () => {
    state.selectResponses = [[]];
    await createPurchase(1, { productName: "151 Booster Box", productType: "box", quantity: 2, price: 18000, shop: "Pokemon Center" });
    expect(JSON.parse(latestActivity("purchase_created").newValue)).toMatchObject({ productName: "151 Booster Box", quantity: 2, totalPrice: 18000 });

    state.selectResponses = [[product]];
    await createSale(1, { productId: product.id, quantity: 1, salePrice: 15000, platform: "mercari" });
    expect(JSON.parse(latestActivity("sale_created").newValue)).toMatchObject({ productName: "Pikachu ex", quantity: 1, totalRevenue: 15000, platform: "mercari" });
  });

  it("ghi snapshot cho thao tác sửa và xóa giao dịch mua", async () => {
    state.selectResponses = [[purchase], [product], [purchase]];
    await updatePurchase(1, { purchaseId: purchase.id, quantity: 3, price: 27000, shop: "Yodobashi" });
    const updateLog = latestActivity("purchase_updated");
    expect(JSON.parse(updateLog.oldValue)).toMatchObject({ quantity: 2, totalPrice: 18000, shop: "Pokemon Center" });
    expect(JSON.parse(updateLog.newValue)).toMatchObject({ quantity: 3, totalPrice: 27000, shop: "Yodobashi" });

    state.selectResponses = [[purchase], [], [product], [purchase]];
    await deletePurchase(1, purchase.id);
    const deleteLog = latestActivity("purchase_deleted");
    expect(JSON.parse(deleteLog.oldValue)).toMatchObject({ id: purchase.id, quantity: 2 });
    expect(deleteLog.newValue).toBeNull();
  });

  it("ghi snapshot cho thao tác sửa và xóa giao dịch bán", async () => {
    state.selectResponses = [[sale], [product]];
    await updateSale(1, { saleId: sale.id, quantity: 1, salePrice: 18000, note: "Đã cập nhật" });
    const updateLog = latestActivity("sale_updated");
    expect(JSON.parse(updateLog.oldValue)).toMatchObject({ quantity: 2, totalRevenue: "30000", note: "Đợt đầu" });
    expect(JSON.parse(updateLog.newValue)).toMatchObject({ quantity: 1, totalRevenue: 18000, note: "Đã cập nhật" });

    state.selectResponses = [[sale], [product]];
    await deleteSale(1, sale.id);
    const deleteLog = latestActivity("sale_deleted");
    expect(JSON.parse(deleteLog.oldValue)).toMatchObject({ id: sale.id, quantity: 2 });
    expect(deleteLog.newValue).toBeNull();
  });

  it("trả về trang lịch sử giới hạn cùng cursor của phần dữ liệu còn lại", async () => {
    const rows = Array.from({ length: 11 }, (_, index) => ({
      id: 111 - index,
      createdAt: new Date(`2026-08-13T${String(11 - index).padStart(2, "0")}:00:00.000Z`),
    }));
    state.selectResponses = [[{ totalCount: 11 }], rows];

    const page = await listActivityLogs(1, { limit: 10 });

    expect(page.items).toEqual(rows.slice(0, 10));
    expect(page.nextCursor).toEqual({ id: rows[9].id, createdAt: rows[9].createdAt });
    expect(page.totalCount).toBe(11);
  });
});
