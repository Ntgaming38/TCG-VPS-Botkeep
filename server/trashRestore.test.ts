import { beforeEach, describe, expect, it, vi } from "vitest";

const inserted: unknown[] = [];
const updated: unknown[] = [];
const trashMocks = vi.hoisted(() => ({ getTrashItem: vi.fn(), markTrashItemRestored: vi.fn() }));
const { getTrashItem, markTrashItemRestored } = trashMocks;

const fakeDb = {
  insert: vi.fn(() => ({ values: vi.fn(async (values: unknown) => inserted.push(values)) })),
  update: vi.fn(() => ({
    set: vi.fn((values: unknown) => {
      updated.push(values);
      return { where: vi.fn(async () => undefined) };
    }),
  })),
};

vi.mock("./db", () => ({ getDb: vi.fn(async () => fakeDb) }));
vi.mock("./trashDb", () => ({ getTrashItem: trashMocks.getTrashItem, markTrashItemRestored: trashMocks.markTrashItemRestored }));

import { restoreTrashItem } from "./trashRestore";

function activeItem(entityType: string, snapshot: unknown) {
  return { id: 71, entityType, entityId: 18, title: "Bản ghi thử nghiệm", snapshot: JSON.stringify(snapshot) };
}

describe("trash restore", () => {
  beforeEach(() => {
    inserted.splice(0);
    updated.splice(0);
    vi.clearAllMocks();
  });

  it("khôi phục sản phẩm cùng các giao dịch mua và bán phụ thuộc", async () => {
    getTrashItem.mockResolvedValue(activeItem("product", {
      product: { id: 18, userId: 1, name: "Pikachu", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
      purchases: [{ id: 20, productId: 18, userId: 1, purchaseDate: "2026-01-01T00:00:00.000Z" }],
      sales: [{ id: 21, productId: 18, userId: 1, saleDate: "2026-01-02T00:00:00.000Z" }],
    }));

    await expect(restoreTrashItem(1, 71)).resolves.toMatchObject({ entityType: "product", restored: true });
    expect(inserted).toHaveLength(3);
    expect(markTrashItemRestored).toHaveBeenCalledWith(1, 71);
  });

  it("khôi phục giao dịch mua hoặc bán cùng trạng thái sản phẩm trước khi xóa", async () => {
    getTrashItem.mockResolvedValueOnce(activeItem("purchase", {
      purchase: { id: 20, productId: 18, userId: 1, purchaseDate: "2026-01-01T00:00:00.000Z" },
      product: { id: 18, userId: 1, name: "Pikachu", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
      productDeleted: false,
    }));
    await restoreTrashItem(1, 71);

    getTrashItem.mockResolvedValueOnce(activeItem("sale", {
      sale: { id: 21, productId: 18, userId: 1, saleDate: "2026-01-02T00:00:00.000Z" },
      product: { id: 18, userId: 1, name: "Pikachu", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
    }));
    await restoreTrashItem(1, 71);

    expect(updated.length).toBeGreaterThanOrEqual(2);
    expect(inserted.length).toBeGreaterThanOrEqual(2);
  });

  it("khôi phục Chyusen, nguồn theo dõi và thông báo đã xóa", async () => {
    getTrashItem.mockResolvedValueOnce(activeItem("chyusen", {
      entry: { id: 18 },
      sources: [{ id: 30, isActive: 0, nextCheckAt: null }],
    }));
    await restoreTrashItem(1, 71);

    getTrashItem.mockResolvedValueOnce(activeItem("source", { source: { id: 30, userId: 1, sourceUrl: "https://example.com", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" } }));
    await restoreTrashItem(1, 71);

    getTrashItem.mockResolvedValueOnce(activeItem("notification", { notification: { id: 40 } }));
    await restoreTrashItem(1, 71);

    expect(updated.length).toBeGreaterThanOrEqual(4);
    expect(inserted.length).toBeGreaterThanOrEqual(1);
    expect(markTrashItemRestored).toHaveBeenCalledTimes(3);
  });
});
