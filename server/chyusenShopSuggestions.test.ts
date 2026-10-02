import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getDb: vi.fn(),
  serializeActivityChange: vi.fn(() => ({})),
}));

import { getDb } from "./db";
import { deleteChyusenShopSuggestion, listChyusenShopSuggestions, listChyusenShopSuggestionsForManagement, listRecentChyusenShops, reorderPinnedChyusenShopSuggestions, saveChyusenShopSuggestion, setChyusenShopSuggestionPinned, updateChyusenShopSuggestion } from "./chyusenDb";

describe("gợi ý cửa hàng Chyusen theo tài khoản", () => {
  beforeEach(() => vi.clearAllMocks());

  it("chỉ trả về cửa hàng của tài khoản hiện tại theo thứ tự tên", async () => {
    vi.mocked(getDb).mockResolvedValue({
      select: () => ({ from: () => ({ where: vi.fn().mockResolvedValue([{ id: 2, name: "Z Shop" }, { id: 1, name: "Bandai Hobby" }]) }) }),
    } as any);

    await expect(listChyusenShopSuggestions(7)).resolves.toEqual(["Bandai Hobby", "Z Shop"]);
  });

  it("xếp cửa hàng dùng nhiều nhất lên đầu danh sách quản lý", async () => {
    const from = vi.fn()
      .mockReturnValueOnce({ where: vi.fn().mockResolvedValue([{ id: 2, name: "Z Shop", isPinned: 1 }, { id: 1, name: "Bandai Hobby", isPinned: 0 }]) })
      .mockReturnValueOnce({ where: vi.fn().mockResolvedValue([{ shop: "Khác", customShopName: "Z Shop" }, { shop: "Khác", customShopName: "Z Shop" }, { shop: "Khác", customShopName: "Bandai Hobby" }]) });
    vi.mocked(getDb).mockResolvedValue({ select: () => ({ from }) } as any);

    await expect(listChyusenShopSuggestionsForManagement(7)).resolves.toMatchObject([
      { id: 2, name: "Z Shop", useCount: 2 },
      { id: 1, name: "Bandai Hobby", useCount: 1 },
    ]);
  });

  it("chuẩn hóa tên mới trước khi lưu và ghi hoạt động", async () => {
    const firstValues = vi.fn().mockResolvedValue([{ insertId: 19 }]);
    const activityValues = vi.fn().mockResolvedValue([]);
    const insert = vi.fn()
      .mockReturnValueOnce({ values: firstValues })
      .mockReturnValueOnce({ values: activityValues });
    vi.mocked(getDb).mockResolvedValue({
      select: () => ({ from: () => ({ where: vi.fn().mockResolvedValue([]) }) }),
      insert,
    } as any);

    await expect(saveChyusenShopSuggestion(7, "  TCG   Tokyo  ")).resolves.toMatchObject({ id: 19, name: "TCG Tokyo", created: true });
    expect(firstValues).toHaveBeenCalledWith({ userId: 7, name: "TCG Tokyo" });
    expect(activityValues).toHaveBeenCalledTimes(1);
  });

  it("chỉ sửa và xóa cửa hàng thuộc tài khoản hiện tại", async () => {
    const updateWhere = vi.fn().mockResolvedValue([]);
    const deleteWhere = vi.fn().mockResolvedValue([]);
    const activityValues = vi.fn().mockResolvedValue([]);
    const rows = [{ id: 19, name: "TCG Tokyo" }];
    vi.mocked(getDb).mockResolvedValue({
      select: () => ({ from: () => ({ where: vi.fn().mockResolvedValue(rows) }) }),
      update: () => ({ set: vi.fn(() => ({ where: updateWhere })) }),
      delete: () => ({ where: deleteWhere }),
      insert: () => ({ values: activityValues }),
    } as any);

    await expect(updateChyusenShopSuggestion(7, 19, "TCG Osaka")).resolves.toMatchObject({ id: 19, name: "TCG Osaka" });
    await expect(deleteChyusenShopSuggestion(7, 19)).resolves.toBeUndefined();
    expect(updateWhere).toHaveBeenCalledTimes(1);
    expect(deleteWhere).toHaveBeenCalledTimes(1);
  });

  it("ghi trạng thái ghim theo tài khoản để ưu tiên lên đầu", async () => {
    const updateWhere = vi.fn().mockResolvedValue([]);
    const set = vi.fn(() => ({ where: updateWhere }));
    const activityValues = vi.fn().mockResolvedValue([]);
    vi.mocked(getDb).mockResolvedValue({
      select: () => ({ from: () => ({ where: vi.fn().mockResolvedValue([{ id: 19, name: "TCG Tokyo", isPinned: 0 }]) }) }),
      update: () => ({ set }),
      insert: () => ({ values: activityValues }),
    } as any);

    await expect(setChyusenShopSuggestionPinned(7, 19, true)).resolves.toEqual({ id: 19, isPinned: true });
    expect(set).toHaveBeenCalledWith({ isPinned: 1, pinnedOrder: 1 });
    expect(updateWhere).toHaveBeenCalledTimes(1);
  });

  it("trả về cửa hàng dùng gần đây theo thời điểm tạo Chyusen", async () => {
    const now = new Date("2026-08-19T09:00:00.000Z");
    vi.mocked(getDb).mockResolvedValue({
      select: () => ({ from: () => ({ where: vi.fn().mockResolvedValue([
        { shop: "Joshin", customShopName: null, createdAt: new Date("2026-08-16T09:00:00.000Z") },
        { shop: "Khác", customShopName: "TCG Tokyo", createdAt: now },
        { shop: "Khác", customShopName: "TCG Tokyo", createdAt: new Date("2026-08-17T09:00:00.000Z") },
      ]) }) }),
    } as any);

    await expect(listRecentChyusenShops(7)).resolves.toEqual([
      { name: "TCG Tokyo", usedAt: now },
      { name: "Joshin", usedAt: new Date("2026-08-16T09:00:00.000Z") },
    ]);
  });

  it("chỉ nhận thứ tự chứa đầy đủ các cửa hàng đã ghim của tài khoản", async () => {
    const updateWhere = vi.fn().mockResolvedValue([]);
    const set = vi.fn(() => ({ where: updateWhere }));
    const activityValues = vi.fn().mockResolvedValue([]);
    vi.mocked(getDb).mockResolvedValue({
      select: () => ({ from: () => ({ where: vi.fn().mockResolvedValue([{ id: 4, name: "A", isPinned: 1 }, { id: 9, name: "B", isPinned: 1 }, { id: 1, name: "C", isPinned: 0 }]) }) }),
      update: () => ({ set }),
      insert: () => ({ values: activityValues }),
    } as any);

    await expect(reorderPinnedChyusenShopSuggestions(7, [9, 4])).resolves.toEqual({ orderedIds: [9, 4] });
    expect(set).toHaveBeenNthCalledWith(1, { pinnedOrder: 1 });
    expect(set).toHaveBeenNthCalledWith(2, { pinnedOrder: 2 });
    await expect(reorderPinnedChyusenShopSuggestions(7, [9])).rejects.toThrow("Thứ tự cửa hàng ghim không hợp lệ");
  });
});
