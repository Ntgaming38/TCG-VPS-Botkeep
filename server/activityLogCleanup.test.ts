import { describe, expect, it } from "vitest";
import { getSensitiveActivityCleanupCutoff, SENSITIVE_ACTIVITY_RETENTION_DAYS } from "../shared/activityLogCleanup";

describe("sensitive activity log cleanup", () => {
  it("keeps activity entries for 30 days", () => {
    const now = new Date("2026-08-16T00:00:00.000Z");
    expect(SENSITIVE_ACTIVITY_RETENTION_DAYS).toBe(30);
    expect(getSensitiveActivityCleanupCutoff(now).toISOString()).toBe("2026-07-17T00:00:00.000Z");
  });
});
