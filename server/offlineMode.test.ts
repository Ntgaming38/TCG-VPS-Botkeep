import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  filterProductsOffline,
  productsListCacheKey,
  readOfflineSnapshot,
  resolveProductsListFallback,
  saveOfflineSnapshot,
} from "../client/src/lib/offlineDataCache";
import {
  addOfflineSaleDraft,
  listOfflineSaleDrafts,
  offlineSaleDraftGross,
  removeOfflineSaleDraft,
} from "../client/src/lib/offlineSaleDrafts";

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(key: string) {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
}

const PRODUCTS = [
  { id: 1, name: "Charizard Box", type: "box", status: "in_stock" },
  { id: 2, name: "Pikachu Card", type: "card", status: "in_stock" },
  { id: 3, name: "Mew Pack", type: "pack", status: "sold" },
  { id: 4, name: "charizard promo", type: "card", status: "sold" },
];

describe("Snapshot dữ liệu offline", () => {
  it("lưu và đọc lại snapshot kèm thời điểm lưu", () => {
    const storage = new MemoryStorage();
    expect(saveOfflineSnapshot("k", [{ id: 1 }], storage, 123456)).toBe(true);
    const snapshot = readOfflineSnapshot<Array<{ id: number }>>("k", storage);
    expect(snapshot?.savedAt).toBe(123456);
    expect(snapshot?.data).toEqual([{ id: 1 }]);
  });

  it("dữ liệu hỏng hoặc thiếu đều trả về null thay vì ném lỗi", () => {
    const storage = new MemoryStorage();
    storage.setItem("tcg-offline-cache:v1:bad", "{not-json");
    expect(readOfflineSnapshot("bad", storage)).toBeNull();
    expect(readOfflineSnapshot("missing", storage)).toBeNull();
    const failingStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {},
    };
    expect(saveOfflineSnapshot("k", [], failingStorage)).toBe(false);
  });

  it("cache key ổn định bất kể thứ tự thuộc tính của bộ lọc", () => {
    expect(productsListCacheKey({ status: "all", type: "box" })).toBe(productsListCacheKey({ type: "box", status: "all" }));
    expect(productsListCacheKey({ status: "all" })).not.toBe(productsListCacheKey({ status: "sold" }));
    expect(productsListCacheKey({})).toBe("products.list:{}");
  });
});

describe("Lọc sản phẩm offline phải khớp ngữ nghĩa lọc của server", () => {
  it("status 'all' gồm cả hàng đã bán; status cụ thể lọc đúng; không status thì loại hàng đã bán", () => {
    expect(filterProductsOffline(PRODUCTS, { status: "all" }).map((p) => p.id)).toEqual([1, 2, 3, 4]);
    expect(filterProductsOffline(PRODUCTS, { status: "sold" }).map((p) => p.id)).toEqual([3, 4]);
    expect(filterProductsOffline(PRODUCTS, {}).map((p) => p.id)).toEqual([1, 2]);
  });

  it("lọc theo type và tìm kiếm theo tên (không phân biệt hoa thường) như server", () => {
    expect(filterProductsOffline(PRODUCTS, { type: "card", status: "all" }).map((p) => p.id)).toEqual([2, 4]);
    expect(filterProductsOffline(PRODUCTS, { status: "all", search: "CHARIZARD" }).map((p) => p.id)).toEqual([1, 4]);
  });

  it("fallback: ưu tiên snapshot đúng bộ lọc; thiếu thì lọc từ snapshot kho đầy đủ đã lưu", () => {
    const storage = new MemoryStorage();
    saveOfflineSnapshot(productsListCacheKey({ status: "all" }), PRODUCTS, storage, 999);
    const fallback = resolveProductsListFallback({ type: "card" }, storage);
    expect(fallback?.savedAt).toBe(999);
    expect(fallback?.data.map((p) => p.id)).toEqual([2]);

    const exactStorage = new MemoryStorage();
    saveOfflineSnapshot(productsListCacheKey({ type: "card" }), [PRODUCTS[1]], exactStorage, 555);
    saveOfflineSnapshot(productsListCacheKey({ status: "all" }), PRODUCTS, exactStorage, 999);
    const exact = resolveProductsListFallback({ type: "card" }, exactStorage);
    expect(exact?.savedAt).toBe(555);
    expect(exact?.data.map((p) => p.id)).toEqual([2]);

    expect(resolveProductsListFallback({ status: "all" }, new MemoryStorage())).toBeNull();
  });
});

describe("Bản nháp bán offline", () => {
  it("thêm, liệt kê, tính tổng và xoá nháp trên bộ nhớ của thiết bị", () => {
    const storage = new MemoryStorage();
    const first = addOfflineSaleDraft({ productId: 7, quantity: 2, salePrice: 15000, platform: "offline" }, "Box A", storage, 1000, "d1");
    const second = addOfflineSaleDraft({ productId: 8, quantity: 1, salePrice: 3000 }, "Card B", storage, 2000, "d2");
    expect(first.productName).toBe("Box A");
    expect(offlineSaleDraftGross(first)).toBe(30000);
    expect(offlineSaleDraftGross(second)).toBe(3000);
    expect(listOfflineSaleDrafts(storage).map((draft) => draft.id)).toEqual(["d1", "d2"]);
    expect(listOfflineSaleDrafts(storage)[0].payload).toEqual({ productId: 7, quantity: 2, salePrice: 15000, platform: "offline" });
    removeOfflineSaleDraft("d1", storage);
    expect(listOfflineSaleDrafts(storage).map((draft) => draft.id)).toEqual(["d2"]);
  });

  it("dữ liệu nháp hỏng không làm sập danh sách", () => {
    const storage = new MemoryStorage();
    storage.setItem("tcg-offline-sale-drafts:v1", "[{\"id\": 42}, null, {\"id\":\"ok\",\"payload\":{\"productId\":1}}]");
    const drafts = listOfflineSaleDrafts(storage);
    expect(drafts.map((draft) => draft.id)).toEqual(["ok"]);
  });
});

describe("Nối dây chế độ offline", () => {
  const root = process.cwd();
  const read = (path: string) => readFileSync(join(root, path), "utf8");

  it("service worker cache app shell nhưng tuyệt đối không cache /api/ và vẫn giữ xử lý push", () => {
    const sw = read("client/public/sw.js");
    expect(sw).toContain('addEventListener("fetch"');
    expect(sw).toContain('url.pathname.startsWith("/api/")');
    expect(sw).toContain("APP_SHELL_CACHE");
    expect(sw).toContain('request.mode === "navigate"');
    expect(sw).toContain('addEventListener("push"');
    expect(sw).toContain('addEventListener("notificationclick"');
  });

  it("trang Kho Hàng dùng snapshot khi mất mạng và gắn nhãn dữ liệu đã lưu", () => {
    const inventory = read("client/src/pages/Inventory.tsx");
    expect(inventory).toContain("useOfflineProductsList");
    expect(inventory).toContain("isOfflineSnapshot");
    expect(inventory).toContain("dữ liệu kho đã lưu trên thiết bị");
  });

  it("trang Bán Hàng: chọn sản phẩm được khi offline, nút Lưu chuyển thành Lưu nháp, có panel đồng bộ nháp", () => {
    const sales = read("client/src/pages/Sales.tsx");
    expect(sales).toContain("useOfflineInStock");
    expect(sales).toContain("submitNewSale");
    expect(sales).toContain("addOfflineSaleDraft");
    expect(sales).toContain("Lưu nháp (đang offline)");
    expect(sales).toContain("<OfflineSaleDrafts");
    const panel = read("client/src/components/OfflineSaleDrafts.tsx");
    expect(panel).toContain("Bản nháp bán offline");
    expect(panel).toContain("trpc.sales.create.useMutation()");
  });

  it("có banner trạng thái offline toàn app", () => {
    expect(read("client/src/App.tsx")).toContain("ConnectivityBanner");
    const banner = read("client/src/components/ConnectivityBanner.tsx");
    expect(banner).toContain("useOnlineStatus");
    expect(banner).toContain("Đang offline");
  });
});
