import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Marketplace bulk sync progress UI", () => {
  it("does not intentionally leave a pending bulk sync at 88 percent", () => {
    const source = readFileSync(join(process.cwd(), "client/src/pages/Marketplace.tsx"), "utf8");

    expect(source).toContain("Math.min(current + 6, 96)");
    expect(source).not.toContain("Math.min(current + 7, 88)");
    expect(source).toContain("URL lỗi hoặc chậm sẽ được ghi nhận riêng");
  });
});
