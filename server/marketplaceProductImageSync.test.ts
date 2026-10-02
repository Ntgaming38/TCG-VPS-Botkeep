import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("Marketplace product image synchronization", () => {
  const source = readFileSync(join(root, "server/db.ts"), "utf8");

  it("trích xuất ảnh metadata SNKRDUNK ngay khi gắn link sản phẩm", () => {
    expect(source).toContain("fetchSnkrdunkProductMetadata(snkrdunkUrl)");
    expect(source).toContain("sourceImage && shouldReplaceImage ? { image: nextUrlImage }");
  });

  it("làm mới ảnh nguồn cùng lúc đồng bộ giá mà vẫn tôn trọng ảnh người dùng tải lên", () => {
    expect(source).toContain("const shouldRefreshImage = !product.image || product.image.includes(\"snkrdunk.com\") || isSnkrdunkGenericImageUrl(product.image)");
    expect(source).toContain("fetchSnkrdunkProductMetadata(product.snkrdunkUrl)");
    expect(source).toContain("...(sourceImage ? { image: sourceImage } : {})");
  });
});
