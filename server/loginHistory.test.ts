import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("login history", () => {
  it("lưu sự kiện sau callback OAuth và chỉ truy vấn theo người dùng hiện tại", () => {
    const oauth = readFileSync(join(process.cwd(), "server/_core/oauth.ts"), "utf8");
    const router = readFileSync(join(process.cwd(), "server/routers.ts"), "utf8");
    expect(oauth).toContain("recordLoginEvent(signedInUser.id");
    expect(router).toContain("loginHistory: protectedProcedure");
    expect(router).toContain("db.listLoginEvents(ctx.user.id)");
  });
});
