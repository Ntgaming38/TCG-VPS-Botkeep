import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseSnkrdunkProductMetadata } from "./snkrdunk";

const projectRoot = resolve(import.meta.dirname, "..");

describe("Shop SNKR URL metadata", () => {
  it("trích xuất tên và ảnh công khai từ metadata SNKRDUNK", () => {
    const metadata = parseSnkrdunkProductMetadata(`
      <html><head>
        <meta property="og:title" content="Pokémon 30th Anniversary Box | SNKRDUNK" />
        <meta property="og:image" content="https://cdn.snkrdunk.com/product.jpg" />
      </head></html>
    `);
    expect(metadata).toEqual({
      title: "Pokémon 30th Anniversary Box",
      imageUrl: "https://cdn.snkrdunk.com/product.jpg",
    });
  });

  it("giữ metadata tùy chọn để URL vẫn theo dõi giá được khi trang không có ảnh", () => {
    expect(parseSnkrdunkProductMetadata("<title>SNKRDUNK</title>")).toEqual({ title: "SNKRDUNK", imageUrl: null });
  });
});

describe("Shop SNKR bulk sync UI", () => {
  it("có đồng bộ tất cả, hiển thị hình URL và cho phép tên tùy chọn", () => {
    const source = readFileSync(resolve(projectRoot, "client/src/pages/SnkrShop.tsx"), "utf8");
    expect(source).toContain("snkrShop.syncAll.useMutation");
    expect(source).toContain("Đồng bộ tất cả");
    expect(source).toContain("bulkSyncEtaSeconds");
    expect(source).toContain("item.imageUrl");
    expect(source).toContain("Tên sản phẩm (tùy chọn)");
    expect(source).toContain("Sửa sản phẩm Shop SNKR");
    expect(source).toContain("setTypeFilter");
    expect(source).toContain("Tất cả (${watchItems.length})");
  });
});
