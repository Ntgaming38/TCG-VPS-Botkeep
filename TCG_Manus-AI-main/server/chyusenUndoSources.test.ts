import { beforeEach, describe, expect, it, vi } from "vitest";

const queryResults: Array<Array<Record<string, unknown>>> = [];
const updateSets: Array<Record<string, unknown>> = [];
const insertValues: Array<Record<string, unknown>> = [];

const fakeDb = {
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => {
        const resolveRows = async () => queryResults.shift() || [];
        return {
          limit: vi.fn(resolveRows),
          then: <TResult1 = Array<Record<string, unknown>>, TResult2 = never>(onfulfilled?: ((value: Array<Record<string, unknown>>) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null) => resolveRows().then(onfulfilled, onrejected),
        };
      }),
    })),
  })),
  update: vi.fn(() => ({
    set: vi.fn((values: Record<string, unknown>) => {
      updateSets.push(values);
      return { where: vi.fn(async () => undefined) };
    }),
  })),
  insert: vi.fn(() => ({
    values: vi.fn(async (values: Record<string, unknown>) => {
      insertValues.push(values);
    }),
  })),
};

vi.mock("./db", () => ({ getDb: vi.fn(async () => fakeDb) }));

import { deleteChyusenEntry, restoreChyusenEntry } from "./chyusenDb";

describe("chyusen delete undo source safety", () => {
  beforeEach(() => {
    queryResults.splice(0);
    updateSets.splice(0);
    insertValues.splice(0);
    vi.clearAllMocks();
  });

  it("tạm dừng nguồn theo dõi cùng thông báo khi xóa mềm Chyusen", async () => {
    queryResults.push([{ id: 44, title: "Pikachu Box" }], [{ id: 9, isActive: 1 }]);

    await expect(deleteChyusenEntry(1, 44)).resolves.toMatchObject({ id: 44, title: "Pikachu Box" });

    expect(updateSets).toContainEqual({ isActive: 0, pausedByEntryDelete: 1, activeBeforeEntryDelete: 1 });
    expect(insertValues).toContainEqual(expect.objectContaining({ entryId: 44, fieldName: "deleted" }));
  });

  it("khôi phục đúng trạng thái tắt ban đầu của nguồn sau hoàn tác", async () => {
    queryResults.push(
      [{ id: 44, title: "Pikachu Box", deletedAt: new Date() }],
      [{ id: 9, activeBeforeEntryDelete: 0, nextCheckAt: null }],
    );

    await expect(restoreChyusenEntry(1, 44)).resolves.toMatchObject({ id: 44, restored: true });

    expect(updateSets).toContainEqual({ isActive: 0, pausedByEntryDelete: 0, activeBeforeEntryDelete: null, nextCheckAt: null });
    expect(insertValues).toContainEqual(expect.objectContaining({ entryId: 44, fieldName: "restored" }));
  });
});
