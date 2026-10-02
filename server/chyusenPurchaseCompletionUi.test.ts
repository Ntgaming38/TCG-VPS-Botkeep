import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(process.cwd(), "client/src/pages/Chyusen.tsx"), "utf8");

describe("Chūsen purchase completion action", () => {
  it("offers a separate completion button after the purchase handoff action", () => {
    expect(source).toContain("markPurchaseCreated = trpc.chyusen.markPurchaseCreated.useMutation");
    expect(source).toContain("Thêm vào Mua Hàng");
    expect(source).toContain("Đã mua hàng");
    expect(source).toContain("markPurchaseCreated.mutate({ id: entry.id })");
  });

  it("shows a pending label and refreshes Chūsen after completion", () => {
    expect(source).toContain("Đang hoàn tất...");
    expect(source).toContain("Đã xác nhận mua hàng. Chyusen đã hoàn tất.");
    expect(source).toContain("invalidate();");
  });
});
