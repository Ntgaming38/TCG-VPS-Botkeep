import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Shop SNKR card information", () => {
  const source = readFileSync(join(process.cwd(), "client/src/pages/SnkrShop.tsx"), "utf8");

  it("hiển thị ngày bắt đầu theo dõi dựa trên createdAt", () => {
    expect(source).toContain("Theo dõi từ {new Date(item.createdAt).toLocaleDateString");
  });

  it("sao chép URL SNKRDUNK trực tiếp trên thẻ và phản hồi bằng toast", () => {
    expect(source).toContain("navigator.clipboard.writeText(sourceUrl)");
    expect(source).toContain("Đã sao chép URL SNKRDUNK.");
    expect(source).toContain("Sao chép URL SNKRDUNK của ${displayName}");
  });
});
