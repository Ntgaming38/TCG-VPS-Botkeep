import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  selectResponses: [] as any[][],
  insertValues: [] as any[],
  updateValues: [] as any[],
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
  delete: vi.fn(() => ({ where: vi.fn(async () => undefined) })),
};

vi.mock("drizzle-orm/mysql2", () => ({ drizzle: vi.fn(() => state.db) }));

import {
  createProduct, createPurchase, createSale, deleteProduct, deletePurchase, deleteSale,
  getProductSuggestions, listActivityLogs, updateProduct, updatePurchase, updateSale,
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
    state.updateValues = [];
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

  it("gộp giao dịch mua khi trùng tên, loại và giá mua/SP; tách khi giá khác", async () => {
    const samePriceLot = { ...product, id: 90, name: "30Th 20 Pack", type: "junk_pack" as const, buyPrice: "360", quantity: 17 };
    const differentPriceLot = { ...samePriceLot, id: 91, buyPrice: "480", quantity: 13 };

    state.selectResponses = [[samePriceLot, differentPriceLot]];
    await createPurchase(1, { productName: "30Th 20 Pack", productType: "junk_pack", quantity: 5, price: 1800 });
    const insertedProducts = state.insertValues.filter((value) => value.name === "30Th 20 Pack");
    expect(state.updateValues).toContainEqual(expect.objectContaining({ quantity: 22, status: "in_stock" }));
    expect(insertedProducts).toHaveLength(0);

    state.selectResponses = [[samePriceLot, differentPriceLot]];
    await createPurchase(1, { productName: "30Th 20 Pack", productType: "junk_pack", quantity: 5, price: 2500 });
    expect(state.insertValues.filter((value) => value.name === "30Th 20 Pack").at(-1)).toMatchObject({ type: "junk_pack", quantity: 5, buyPrice: "500" });
  });

  it("gộp khi thêm trực tiếp Card, Box hoặc Pack cùng tên, loại và giá mua/SP", async () => {
    const matchingBoxLot = { ...product, id: 92, name: "151 Booster Box", type: "box" as const, buyPrice: "9000", quantity: 2 };
    state.selectResponses = [[matchingBoxLot]];

    await createProduct({ userId: 1, name: "151 Booster Box", type: "box", quantity: 3, buyPrice: "27000", status: "in_stock" });

    const insertedProducts = state.insertValues.filter((value) => value.name === "151 Booster Box");
    expect(state.updateValues).toContainEqual(expect.objectContaining({ quantity: 5, status: "in_stock" }));
    expect(insertedProducts).toHaveLength(0);
    expect(JSON.parse(latestActivity("product_created").newValue)).toMatchObject({ mergedIntoProductId: matchingBoxLot.id, totalBuyPrice: 27000, buyPrice: "9000" });

    state.selectResponses = [[matchingBoxLot]];
    await createProduct({ userId: 1, name: "151 Booster Box", type: "box", quantity: 3, buyPrice: "30000", status: "in_stock" });
    expect(state.insertValues.filter((value) => value.name === "151 Booster Box").at(-1)).toMatchObject({ quantity: 3, buyPrice: "10000" });
  });

  it("kích hoạt lại lô đã bán khi mua lại cùng tên, loại và giá", async () => {
    const soldProduct = { ...product, quantity: 0, status: "sold" as const };
    state.selectResponses = [[soldProduct]];

    await createPurchase(1, { productName: soldProduct.name, productType: "card", quantity: 2, price: 20000 });

    const insertedProducts = state.insertValues.filter((value) => value.name === soldProduct.name);
    expect(state.updateValues).toContainEqual(expect.objectContaining({ quantity: 2, status: "in_stock" }));
    expect(insertedProducts).toHaveLength(0);

    state.selectResponses = [[soldProduct]];
    await expect(getProductSuggestions(1, "Pikachu")).resolves.toEqual([
      expect.objectContaining({ id: soldProduct.id, status: "sold", quantity: 0 }),
    ]);
  });

  it("ghi snapshot cho thao tác sửa và xóa giao dịch mua", async () => {
    state.selectResponses = [[purchase], [product], [purchase]];
    await updatePurchase(1, { purchaseId: purchase.id, quantity: 3, price: 27000, shop: "Yodobashi" });
    const updateLog = latestActivity("purchase_updated");
    expect(JSON.parse(updateLog.oldValue)).toMatchObject({ quantity: 2, totalPrice: 18000, shop: "Pokemon Center" });
    expect(JSON.parse(updateLog.newValue)).toMatchObject({ quantity: 3, totalPrice: 27000, shop: "Yodobashi" });

    state.selectResponses = [[purchase], [product], [purchase]];
    await deletePurchase(1, purchase.id);
    const deleteLog = latestActivity("purchase_deleted");
    expect(JSON.parse(deleteLog.oldValue)).toMatchObject({ id: purchase.id, quantity: 2 });
    expect(deleteLog.newValue).toBeNull();
  });

  it("cho phép xóa một giao dịch mua nhập nhầm khi sản phẩm đã bán nhưng tồn kho còn đủ", async () => {
    const geoPurchase = { ...purchase, id: 51, shop: "Geo", quantity: 5, totalPrice: "5000" };
    const laterPurchase = { ...purchase, id: 52, shop: "Pokemon Center", quantity: 5, totalPrice: "6000" };
    const productAfterSales = { ...product, quantity: 5, status: "in_stock" as const };
    state.selectResponses = [[geoPurchase], [productAfterSales], [geoPurchase, laterPurchase]];

    await expect(deletePurchase(1, geoPurchase.id)).resolves.toMatchObject({ success: true });
    expect(state.updateValues).toContainEqual(expect.objectContaining({ quantity: 0, status: "sold" }));
    expect(latestActivity("purchase_deleted")).toMatchObject({ entityId: geoPurchase.id });
  });

  it("chặn xóa giao dịch mua khi số lượng còn lại không đủ để bảo toàn lịch sử bán", async () => {
    const geoPurchase = { ...purchase, id: 53, shop: "Geo", quantity: 5, totalPrice: "5000" };
    const productWithInsufficientStock = { ...product, quantity: 4, status: "in_stock" as const };
    state.selectResponses = [[geoPurchase], [productWithInsufficientStock]];

    await expect(deletePurchase(1, geoPurchase.id)).rejects.toThrow("tồn kho hiện chỉ còn 4 sản phẩm");
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
