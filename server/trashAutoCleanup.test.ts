import { describe, expect, it } from "vitest";
import { getTrashAutoCleanupCutoff } from "./trashAutoCleanup";

describe("trash automatic cleanup cutoff", () => {
  it("calculates the expiration boundary from the chosen retention days", () => {
    const now = new Date(2026, 7, 14, 10, 30, 0);
    expect(getTrashAutoCleanupCutoff(30, now)).toEqual(new Date(2026, 6, 15, 10, 30, 0));
    expect(getTrashAutoCleanupCutoff(7, now)).toEqual(new Date(2026, 7, 7, 10, 30, 0));
  });
});
