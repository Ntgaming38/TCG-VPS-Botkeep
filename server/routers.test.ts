import { describe, expect, it } from "vitest";
import { vi } from "vitest";

vi.mock("./chyusenDb", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./chyusenDb")>();
  return {
    ...actual,
    getChyusenEntry: vi.fn(),
    createChyusenEntry: vi.fn(),
    updateChyusenEntry: vi.fn(),
    deleteChyusenEntry: vi.fn(),
    restoreChyusenEntry: vi.fn(),
    markChyusenNotificationRead: vi.fn(),
    markChyusenPurchaseCreated: vi.fn(),
    updateChyusenSource: vi.fn(),
    deleteChyusenSource: vi.fn(),
  };
});

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    listActivityLogs: vi.fn(),
  };
});

vi.mock("./trashDb", () => ({ listTrashItems: vi.fn(), emptyTrashItems: vi.fn() }));
vi.mock("./trashRestore", () => ({ restoreTrashItem: vi.fn() }));

import { appRouter } from "./routers";
import * as chyusenDb from "./chyusenDb";
import * as db from "./db";
import { emptyTrashItems, listTrashItems } from "./trashDb";
import { restoreTrashItem } from "./trashRestore";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-001",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

describe("appRouter", () => {
  describe("auth.me", () => {
    it("returns user when authenticated", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.auth.me();
      expect(result).toBeDefined();
      expect(result?.name).toBe("Test User");
      expect(result?.email).toBe("test@example.com");
    });

    it("returns null when not authenticated", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.auth.me();
      expect(result).toBeNull();
    });
  });

  describe("products router", () => {
    it("requires authentication for products.list", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.products.list({})).rejects.toThrow();
    });

    it("requires authentication for products.create", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.products.create({
          name: "Test Card",
          type: "card",
          quantity: 1,
          buyPrice: 1000,
        })
      ).rejects.toThrow();
    });
  });

  describe("sales router", () => {
    it("requires authentication for sales.list", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.sales.list({})).rejects.toThrow();
    });
  });

  describe("purchases router", () => {
    it("requires authentication for purchases.list", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.purchases.list({})).rejects.toThrow();
    });
  });

  describe("dashboard router", () => {
    it("requires authentication for dashboard.stats", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.dashboard.stats()).rejects.toThrow();
    });
  });

  describe("reports router", () => {
    it("requires authentication for reports.overview", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.reports.overview()).rejects.toThrow();
    });
  });

  describe("activities router", () => {
    it("chỉ trả nhật ký của người dùng đang đăng nhập với bộ lọc đã chọn", async () => {
      vi.mocked(db.listActivityLogs).mockResolvedValue({ items: [], nextCursor: null, totalCount: 0 });
      const caller = appRouter.createCaller(createAuthContext());
      const cursor = { id: 91, createdAt: new Date("2026-08-13T00:00:00.000Z") };

      await caller.activities.list({ entityType: "sale", syncScope: "only", search: "Pikachu", limit: 25, cursor });

      expect(db.listActivityLogs).toHaveBeenCalledWith(1, { entityType: "sale", syncScope: "only", search: "Pikachu", limit: 25, cursor });
    });

    it("chấp nhận bộ lọc hoạt động Chūsen", async () => {
      vi.mocked(db.listActivityLogs).mockResolvedValue({ items: [], nextCursor: null, totalCount: 0 });
      const caller = appRouter.createCaller(createAuthContext());

      await caller.activities.list({ entityType: "chyusen", limit: 25 });

      expect(db.listActivityLogs).toHaveBeenCalledWith(1, { entityType: "chyusen", limit: 25 });
    });

    it("yêu cầu đăng nhập trước khi xem nhật ký hoạt động", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(caller.activities.list()).rejects.toThrow();
    });
  });

  describe("trash router", () => {
    it("chỉ liệt kê Thùng rác của người dùng đang đăng nhập và hỗ trợ lọc loại dữ liệu", async () => {
      vi.mocked(listTrashItems).mockResolvedValue([
        { id: 41, entityType: "product", entityId: 8, title: "Pikachu", deletedAt: new Date() },
        { id: 42, entityType: "sale", entityId: 9, title: "Bán Pikachu", deletedAt: new Date() },
      ] as any);
      const caller = appRouter.createCaller(createAuthContext());

      await expect(caller.trash.list({ entityType: "sale" })).resolves.toHaveLength(1);
      expect(listTrashItems).toHaveBeenCalledWith(1);
    });

    it("khôi phục một mục Thùng rác theo đúng người dùng đang đăng nhập", async () => {
      vi.mocked(restoreTrashItem).mockResolvedValue({ id: 41, entityType: "product", title: "Pikachu", restored: true });
      const caller = appRouter.createCaller(createAuthContext());

      await expect(caller.trash.restore({ id: 41 })).resolves.toMatchObject({ restored: true });
      expect(restoreTrashItem).toHaveBeenCalledWith(1, 41);
    });

    it("khôi phục nhiều mục Thùng rác theo đúng người dùng đang đăng nhập", async () => {
      vi.mocked(restoreTrashItem).mockResolvedValueOnce({ id: 41, entityType: "product", title: "Pikachu", restored: true }).mockResolvedValueOnce({ id: 42, entityType: "sale", title: "Bán Pikachu", restored: true });
      const caller = appRouter.createCaller(createAuthContext());

      await expect(caller.trash.restoreMany({ ids: [41, 42, 41] })).resolves.toMatchObject({ restoredCount: 2 });
      expect(restoreTrashItem).toHaveBeenCalledWith(1, 41);
      expect(restoreTrashItem).toHaveBeenCalledWith(1, 42);
    });

    it("chỉ dọn sạch mục Thùng rác của người dùng sau khi xác nhận", async () => {
      vi.mocked(emptyTrashItems).mockResolvedValue({ purgedCount: 2 });
      const caller = appRouter.createCaller(createAuthContext());

      await expect(caller.trash.empty({ confirmed: true })).resolves.toEqual({ purgedCount: 2 });
      expect(emptyTrashItems).toHaveBeenCalledWith(1);
    });

    it("xóa vĩnh viễn chỉ các mục đã chọn", async () => {
      vi.mocked(emptyTrashItems).mockResolvedValue({ purgedCount: 2 });
      const caller = appRouter.createCaller(createAuthContext());

      await expect(caller.trash.purgeMany({ ids: [41, 42], confirmed: true })).resolves.toEqual({ purgedCount: 2 });
      expect(emptyTrashItems).toHaveBeenCalledWith(1, [41, 42]);
    });
  });

  describe("chyusen router", () => {
    it("cho phép lưu Chyusen nhập thủ công khi không có URL nguồn", async () => {
      vi.mocked(chyusenDb.createChyusenEntry).mockResolvedValue({ id: 88, sourceId: null });
      const caller = appRouter.createCaller(createAuthContext());

      await caller.chyusen.create({ title: "抽選 thủ công", productName: "Pikachu Box" });

      expect(chyusenDb.createChyusenEntry).toHaveBeenCalledWith(1, expect.objectContaining({
        title: "抽選 thủ công", productName: "Pikachu Box", sourceUrl: undefined,
      }));
    });

    it("giữ luồng lưu Chyusen với URL nguồn hợp lệ", async () => {
      vi.mocked(chyusenDb.createChyusenEntry).mockResolvedValue({ id: 89, sourceId: 5 });
      const caller = appRouter.createCaller(createAuthContext());

      await caller.chyusen.create({ title: "抽選 từ link", productName: "Eevee Box", sourceUrl: "https://joshinweb.jp/game/lottery" });

      expect(chyusenDb.createChyusenEntry).toHaveBeenCalledWith(1, expect.objectContaining({
        sourceUrl: "https://joshinweb.jp/game/lottery",
      }));
    });

    it("nhận payload cập nhật có ngày đã được chuyển từ ngày/tháng", async () => {
      vi.mocked(chyusenDb.updateChyusenEntry).mockResolvedValue({ updated: true });
      const caller = appRouter.createCaller(createAuthContext());
      const applicationEnd = new Date("2027-01-04T15:00:00.000Z");

      await caller.chyusen.update({ id: 88, data: { applicationEnd } });

      expect(chyusenDb.updateChyusenEntry).toHaveBeenCalledWith(1, 88, expect.objectContaining({ applicationEnd }));
    });

    it("xóa mềm và hoàn tác Chyusen theo đúng user đang đăng nhập", async () => {
      vi.mocked(chyusenDb.deleteChyusenEntry).mockResolvedValue({ id: 88, title: "Pikachu Box", deletedAt: new Date() });
      vi.mocked(chyusenDb.restoreChyusenEntry).mockResolvedValue({ id: 88, title: "Pikachu Box", restored: true });
      const caller = appRouter.createCaller(createAuthContext());

      await expect(caller.chyusen.delete({ id: 88 })).resolves.toMatchObject({ id: 88, title: "Pikachu Box" });
      await expect(caller.chyusen.restore({ id: 88 })).resolves.toEqual({ id: 88, title: "Pikachu Box", restored: true });
      expect(chyusenDb.deleteChyusenEntry).toHaveBeenCalledWith(1, 88);
      expect(chyusenDb.restoreChyusenEntry).toHaveBeenCalledWith(1, 88);
    });

    it("đánh dấu thông báo đã đọc theo đúng user đang đăng nhập", async () => {
      vi.mocked(chyusenDb.markChyusenNotificationRead).mockResolvedValue(undefined);
      const caller = appRouter.createCaller(createAuthContext());

      await caller.chyusen.markNotificationRead({ id: 91, isRead: true });

      expect(chyusenDb.markChyusenNotificationRead).toHaveBeenCalledWith(1, 91, true);
    });

    it("chỉ tạo draft Mua Hàng cho Chyusen trúng và không đánh dấu mua trước khi có mutation riêng", async () => {
      vi.mocked(chyusenDb.getChyusenEntry).mockResolvedValue({
        id: 31, applicationStatus: "won", resultStatus: "won", purchaseCreatedAt: null,
        productName: "Premium Box", productType: "box", series: "Pokemon", shop: "Joshin", customShopName: null, price: "9800", sourceUrl: "https://joshinweb.jp/game/lottery",
      } as any);
      const caller = appRouter.createCaller(createAuthContext());

      const draft = await caller.chyusen.purchaseDraft({ id: 31 });

      expect(draft).toMatchObject({ chyusenEntryId: 31, productName: "Premium Box", productType: "box", price: 9800 });
      expect(chyusenDb.markChyusenPurchaseCreated).not.toHaveBeenCalled();
      await caller.chyusen.markPurchaseCreated({ id: 31 });
      expect(chyusenDb.markChyusenPurchaseCreated).toHaveBeenCalledWith(1, 31);
      expect(chyusenDb.deleteChyusenEntry).toHaveBeenCalledWith(1, 31);
    });

    it("chuyển Chyusen Đã trượt vào Thùng rác ngay sau khi cập nhật", async () => {
      vi.mocked(chyusenDb.updateChyusenEntry).mockResolvedValue({ id: 43, applicationStatus: "lost", resultStatus: "lost" } as any);
      vi.mocked(chyusenDb.deleteChyusenEntry).mockResolvedValue({ id: 43, title: "Starter Deck", deletedAt: new Date() });
      const caller = appRouter.createCaller(createAuthContext());

      await expect(caller.chyusen.setParticipation({ id: 43, applicationStatus: "lost" })).resolves.toMatchObject({ id: 43, trashed: true });
      expect(chyusenDb.deleteChyusenEntry).toHaveBeenCalledWith(1, 43);
    });

    it("hoàn tác Đã trúng về Đã đăng ký khi chưa tạo Mua Hàng", async () => {
      vi.mocked(chyusenDb.getChyusenEntry).mockResolvedValue({ id: 46, applicationStatus: "won", resultStatus: "won", purchaseCreatedAt: null } as any);
      vi.mocked(chyusenDb.updateChyusenEntry).mockResolvedValue({ id: 46, applicationStatus: "registered", resultStatus: "pending" } as any);
      const caller = appRouter.createCaller(createAuthContext());

      await expect(caller.chyusen.undoWon({ id: 46 })).resolves.toMatchObject({ id: 46, applicationStatus: "registered" });
      expect(chyusenDb.updateChyusenEntry).toHaveBeenCalledWith(1, 46, { applicationStatus: "registered", resultStatus: "pending", resultCheckedAt: null });
    });

    it("không hoàn tác Đã trúng sau khi đã tạo Mua Hàng", async () => {
      vi.mocked(chyusenDb.getChyusenEntry).mockResolvedValue({ id: 47, applicationStatus: "won", resultStatus: "won", purchaseCreatedAt: new Date() } as any);
      const caller = appRouter.createCaller(createAuthContext());

      await expect(caller.chyusen.undoWon({ id: 47 })).rejects.toThrow("Không thể hoàn tác sau khi Chyusen đã được chuyển sang Mua Hàng.");
    });

    it("chặn đánh dấu Đã trúng trước ngày công bố kết quả", async () => {
      vi.mocked(chyusenDb.getChyusenEntry).mockResolvedValue({ id: 48, resultDate: new Date("2027-08-17T00:00:00+09:00") } as any);
      const caller = appRouter.createCaller(createAuthContext());

      await expect(caller.chyusen.setParticipation({ id: 48, applicationStatus: "won" })).rejects.toThrow("Chỉ có thể đánh dấu Đã trúng từ ngày công bố kết quả");
      expect(chyusenDb.updateChyusenEntry).not.toHaveBeenCalledWith(1, 48, expect.anything());
    });

    it("ghi nhận thời điểm đã kiểm tra kết quả cho Chyusen đang chờ", async () => {
      vi.mocked(chyusenDb.getChyusenEntry).mockResolvedValue({ id: 49, applicationStatus: "registered", resultStatus: "pending", resultDate: new Date("2026-08-17T00:00:00+09:00") } as any);
      vi.mocked(chyusenDb.updateChyusenEntry).mockResolvedValue({ id: 49, resultCheckedAt: new Date() } as any);
      const caller = appRouter.createCaller(createAuthContext());

      await expect(caller.chyusen.markResultChecked({ id: 49 })).resolves.toMatchObject({ id: 49 });
      expect(chyusenDb.updateChyusenEntry).toHaveBeenCalledWith(1, 49, { resultCheckedAt: expect.any(Date) });
    });

    it("cho phép chủ sở hữu sửa URL, nhãn, trạng thái và tần suất của nguồn theo dõi", async () => {
      vi.mocked(chyusenDb.updateChyusenSource).mockResolvedValue(undefined);
      const caller = appRouter.createCaller(createAuthContext());

      await caller.chyusen.updateSource({
        id: 14,
        label: "Joshin mới",
        sourceUrl: "https://joshinweb.jp/game/lottery",
        isActive: false,
        checkIntervalMinutes: 180,
      });

      expect(chyusenDb.updateChyusenSource).toHaveBeenCalledWith(1, 14, {
        label: "Joshin mới",
        sourceUrl: "https://joshinweb.jp/game/lottery",
        isActive: false,
        checkIntervalMinutes: 180,
      });
    });

    it("xóa nguồn theo dõi theo đúng user đang đăng nhập", async () => {
      vi.mocked(chyusenDb.deleteChyusenSource).mockResolvedValue(undefined);
      const caller = appRouter.createCaller(createAuthContext());

      await caller.chyusen.deleteSource({ id: 14 });

      expect(chyusenDb.deleteChyusenSource).toHaveBeenCalledWith(1, 14);
    });
  });
});
