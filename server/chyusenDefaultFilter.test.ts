import { describe, expect, it } from "vitest";
import { resolveChyusenDefaultFilter } from "../shared/chyusenDefaultFilter";

describe("default Chyusen filter", () => {
  it("uses all statuses without a deliberate dashboard filter", () => {
    expect(resolveChyusenDefaultFilter("")).toBe("all");
    expect(resolveChyusenDefaultFilter("?filter=unknown")).toBe("all");
  });

  it("preserves a deliberate dashboard filter", () => {
    expect(resolveChyusenDefaultFilter("?filter=dashboard_expiring")).toBe("dashboard_expiring");
  });
});
