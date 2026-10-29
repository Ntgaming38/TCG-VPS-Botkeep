import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  selectResponses: [] as any[][],
  insertValues: [] as any[],
  updateValues: [] as any[],
  deleteCalls: 0,
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
    set: vi.fn((value) => {
      state.updateValues.push(value);
      return { where: vi.fn(async () => undefined) };
    }),
  })),
  delete: vi.fn(() => {
    state.deleteCalls += 1;
    return { where: vi.fn(async () => undefined) };
  }),
};

vi.mock("drizzle-orm/mysql2", () => ({ drizzle: vi.fn(() => state.db) }));

import { createProduct, updateProduct } from "./db";

const product = {
  id: 8, userId: 1, name: "Pikachu ex", type: "card" as const, series: "Pokemon", setName: null,
  image: null, description: "Ghi chú lô", cardNumber: null, language: "Japanese", rarity: null, condition: "A",
  psaGrade: null, releaseDate: null, quantity: 4, damagedQuantity: 0, damageNote: null, buyPrice: "10000",
  marketPrice: "12000", snkrdunkUrl: null, snkrdunkLastSyncedAt: null, sellPrice: "0", status: "in_stock" as const,
  createdAt: new Date("2026-08-13T00:00:00.000Z"), updatedAt: new Date("2026-08-13T00:00:00.000Z"),
};

function purchaseInserts() {
  return state.insertValues.filter((value) => value && typeof value === "object" && "purchaseType" in value && "productId" in value);
}

function purchaseUpdates() {
  return state.updateValues.filter((value) => value && typeof value === "object" && "totalPrice" in value && "price" in value);
}

describe("Sổ mua nhất quán với mục Card/Box/Pack", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "mysql://user:pass@localhost:3306/db";
    state.selectResponses = [];
    state.insertValues = [];
    state.updateValues = [];
    state.deleteCalls = 0;
    state.nextId = 1;
    vi.clearAllMocks();
  });

  it("thêm mới sản phẩm (không gộp) cũng tạo bản ghi mua như mua trong Mua hàng", async () => {
    state.selectResponses = [[]];
    const result = await createProduct({ userId: 1, name: "Mew ex", type: "card", quantity: 2, buyPrice: "18000", description: "Mua ở Geo", status: "in_stock" });

    expect(result.merged).toBe(false);
    const inserts = purchaseInserts();
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({
      userId: 1, productId: result.id, shop: null, purchaseType: "mua_le",
      quantity: 2, price: "9000", totalPrice: "18000", note: "Mua ở Geo", status: "received",
    });
    expect(result.purchaseId).toBeGreaterThan(0);
    const log = state.insertValues.filter((value) => value.action === "purchase_created").at(-1);
    expect(log).toMatchObject({ entityType: "purchase", entityId: result.purchaseId });
  });

  it("thêm mới bị gộp vào lô có sẵn vẫn tạo bản ghi mua cho phần thêm vào", async () => {
    const matchingLot = { ...product, id: 92, name: "151 Booster Box", type: "box" as const, buyPrice: "9000", quantity: 2 };
    state.selectResponses = [[matchingLot]];

    const result = await createProduct({ userId: 1, name: "151 Booster Box", type: "box", quantity: 3, buyPrice: "27000", status: "in_stock" });

    expect(result).toMatchObject({ id: 92, merged: true });
    const inserts = purchaseInserts();
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({ productId: 92, quantity: 3, price: "9000", totalPrice: "27000" });
  });

  it("sửa giá mua ở mục sản phẩm thì bản ghi mua được tính lại theo giá mới", async () => {
    const purchaseRow = {
      id: 31, userId: 1, productId: product.id, shop: null, purchaseType: "mua_le" as const,
      quantity: 4, price: "10000", totalPrice: "40000", note: null, image: null,
      status: "received" as const, purchaseDate: new Date("2026-08-12T00:00:00.000Z"), createdAt: new Date("2026-08-12T00:00:00.000Z"),
    };
    state.selectResponses = [[product], [purchaseRow]];

    await updateProduct(product.id, 1, { buyPrice: "44000" });

    expect(purchaseUpdates()).toContainEqual({ quantity: 4, price: "11000", totalPrice: "44000" });
    expect(state.deleteCalls).toBe(0);
  });

  it("tăng số lượng ở mục sản phẩm thì lần mua gần nhất tăng theo", async () => {
    const purchaseRow = {
      id: 31, userId: 1, productId: product.id, shop: null, purchaseType: "mua_le" as const,
      quantity: 4, price: "10000", totalPrice: "40000", note: null, image: null,
      status: "received" as const, purchaseDate: new Date("2026-08-12T00:00:00.000Z"), createdAt: new Date("2026-08-12T00:00:00.000Z"),
    };
    state.selectResponses = [[product], [purchaseRow]];

    await updateProduct(product.id, 1, { quantity: 6 });

    expect(purchaseUpdates()).toContainEqual({ quantity: 6, price: "10000", totalPrice: "60000" });
  });

  it("giảm số lượng thì trừ vào các lần mua gần nhất trước, hết hẳn thì xoá bản ghi mua đó", async () => {
    const latest = {
      id: 32, userId: 1, productId: product.id, shop: null, purchaseType: "mua_le" as const,
      quantity: 2, price: "10000", totalPrice: "20000", note: null, image: null,
      status: "received" as const, purchaseDate: new Date("2026-08-12T00:00:00.000Z"), createdAt: new Date("2026-08-12T00:00:00.000Z"),
    };
    const older = { ...latest, id: 31, quantity: 2, purchaseDate: new Date("2026-08-10T00:00:00.000Z") };
    state.selectResponses = [[product], [latest, older]];

    await updateProduct(product.id, 1, { quantity: 1 });

    expect(state.deleteCalls).toBe(1);
    expect(purchaseUpdates()).toContainEqual({ quantity: 1, price: "10000", totalPrice: "10000" });
  });

  it("sản phẩm cũ chưa có bản ghi mua thì lần sửa giá/số lượng đầu tiên tạo bản ghi bù theo ngày tạo sản phẩm", async () => {
    state.selectResponses = [[product], []];

    await updateProduct(product.id, 1, { quantity: 5 });

    const inserts = purchaseInserts();
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({
      productId: product.id, quantity: 5, price: "10000", totalPrice: "50000",
      purchaseDate: product.createdAt,
    });
  });

  it("sửa tên/ảnh (không đụng số lượng và giá mua) thì không đụng vào sổ mua", async () => {
    state.selectResponses = [[product]];

    await updateProduct(product.id, 1, { name: "Pikachu ex (đổi tên)" });

    expect(purchaseInserts()).toHaveLength(0);
    expect(purchaseUpdates()).toHaveLength(0);
    expect(state.deleteCalls).toBe(0);
  });
});
