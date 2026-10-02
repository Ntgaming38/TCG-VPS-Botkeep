import { describe, expect, it } from "vitest";
import { matchesTrashQuickPeriod } from "../shared/trashQuickPeriod";

describe("trash quick period filters", () => {
  const now = new Date(2026, 7, 14, 12, 0, 0);

  it("keeps only dates from the current Monday-to-Sunday week", () => {
    expect(matchesTrashQuickPeriod(new Date(2026, 7, 10), "week", now)).toBe(true);
    expect(matchesTrashQuickPeriod(new Date(2026, 7, 16), "week", now)).toBe(true);
    expect(matchesTrashQuickPeriod(new Date(2026, 7, 9), "week", now)).toBe(false);
    expect(matchesTrashQuickPeriod(new Date(2026, 7, 17), "week", now)).toBe(false);
  });

  it("keeps only dates from the current calendar month", () => {
    expect(matchesTrashQuickPeriod(new Date(2026, 7, 1), "month", now)).toBe(true);
    expect(matchesTrashQuickPeriod(new Date(2026, 7, 31), "month", now)).toBe(true);
    expect(matchesTrashQuickPeriod(new Date(2026, 6, 31), "month", now)).toBe(false);
  });
});
