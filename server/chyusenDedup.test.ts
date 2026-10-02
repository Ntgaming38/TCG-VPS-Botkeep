import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getDb: vi.fn() }));

import { getDb } from "./db";
import { findDuplicateChyusenEntry } from "./chyusenDb";

describe("findDuplicateChyusenEntry", () => {
  const start = new Date("2026-08-15T01:00:00.000Z");
  const end = new Date("2026-08-16T01:00:00.000Z");

  beforeEach(() => {
    vi.mocked(getDb).mockResolvedValue({
      select: () => ({ from: () => ({ where: vi.fn().mockResolvedValue([
        { id: 7, title: "Joshin Premium Box", sourceUrl: "https://joshinweb.jp/lottery/a", externalProductId: "1000255803", productName: "Premium Box", shop: "Joshin", customShopName: null, applicationStart: start, applicationEnd: end },
      ]) }) }),
    } as any);
  });

  it("phát hiện trùng URL trước khi tạo Chyusen mới", async () => {
    const duplicate = await findDuplicateChyusenEntry(1, { sourceUrl: "https://joshinweb.jp/lottery/a", productName: "Khác", shop: "Khác" });
    expect(duplicate?.id).toBe(7);
  });

  it("phát hiện trùng theo tên sản phẩm, shop và lịch đăng ký khi URL khác", async () => {
    const duplicate = await findDuplicateChyusenEntry(1, { sourceUrl: "https://joshinweb.jp/lottery/b", productName: "  premium box ", shop: "joshin", applicationStart: start, applicationEnd: end });
    expect(duplicate?.id).toBe(7);
  });

  it("phát hiện Product ID trùng và bỏ qua chính bản ghi đang cập nhật", async () => {
    const duplicate = await findDuplicateChyusenEntry(1, { sourceUrl: "https://khac.jp/lottery/c", externalProductId: "1000255803", productName: "Khác", shop: "Khác" });
    expect(duplicate?.id).toBe(7);

    const selfUpdate = await findDuplicateChyusenEntry(1, { sourceUrl: "https://joshinweb.jp/lottery/a", externalProductId: "1000255803", productName: "Premium Box", shop: "Joshin", applicationStart: start, applicationEnd: end }, 7);
    expect(selfUpdate).toBeUndefined();
  });

  it("cho phép tạo Chyusen khác khi lịch đăng ký khác", async () => {
    const duplicate = await findDuplicateChyusenEntry(1, { sourceUrl: "https://joshinweb.jp/lottery/b", productName: "Premium Box", shop: "Joshin", applicationStart: start, applicationEnd: new Date("2026-08-17T01:00:00.000Z") });
    expect(duplicate).toBeUndefined();
  });
});
