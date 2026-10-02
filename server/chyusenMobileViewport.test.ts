import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Chyusen trên màn hình nhỏ", () => {
  it("khóa thu phóng, giữ tên tiếng Nhật dài trong thẻ và mở popup khi chạm", () => {
    const html = readFileSync(join(process.cwd(), "client/index.html"), "utf8");
    const page = readFileSync(join(process.cwd(), "client/src/pages/Chyusen.tsx"), "utf8");
    const router = readFileSync(join(process.cwd(), "server/routers.ts"), "utf8");

    expect(html).toContain("user-scalable=no");
    expect(html).toContain("maximum-scale=1");
    expect(page).toContain("w-full min-w-0 max-w-full");
    expect(page).toContain("min-w-0 flex-1 truncate text-left");
    expect(page).toContain('aria-label={`Xem đầy đủ tên sản phẩm: ${entry.title}`}');
    expect(page).toContain('onClick={() => setFullTitleEntry({ id: entry.id, title: entry.title })}');
    expect(page).toContain("Tên sản phẩm Chyusen");
    expect(page).toContain("Toàn bộ tên sản phẩm được hiển thị bên dưới.");
    expect(page).toContain("break-words");
    expect(page).toContain('title={`${displayChyusenShop(entry)} · ${entry.productType} · ${entry.series || "Pokemon"}`} className="mt-1 truncate"');
    expect(page).toContain("max-h-[calc(100dvh-1rem)]");
    expect(page).toContain("w-[calc(100vw-1rem)]");
    expect(page).toContain("sm:max-w-4xl lg:max-w-5xl");
    expect(page).toContain("min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain");
    expect(page).toContain("sticky bottom-0 z-10");
    expect(page).toContain("data-chyusen-completion");
    expect(page).toContain("Hoàn thiện thông tin");
    expect(page).toContain("data-chyusen-qr-tools");
    expect(page).toContain("<details");
    expect(page).not.toContain('"Đã kiểm tra kết quả"');
    expect(page).not.toContain("Đã kiểm tra lần gần nhất:");
    expect(router).toContain("sourceContentHash: z.string().trim().max(64).nullable().optional()");
  });
});
