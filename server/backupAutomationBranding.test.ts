import { describe, expect, it } from "vitest";
import { AUTO_BACKUP_CRON } from "../server/backupScheduler";

describe("auto backup scheduling", () => {
  it("uses safe six-field UTC schedules for weekly and monthly snapshots", () => {
    expect(AUTO_BACKUP_CRON.weekly).toBe("0 0 3 * * 0");
    expect(AUTO_BACKUP_CRON.monthly).toBe("0 0 3 1 * *");
  });
});

describe("report branding safety", () => {
  it("keeps logo uploads limited to supported image data URLs at the profile boundary", async () => {
    const { parseAvatarDataUrl } = await import("../server/userProfile");
    expect(() => parseAvatarDataUrl("data:image/svg+xml;base64,PHN2Zz4=")).toThrow();
    expect(() => parseAvatarDataUrl("data:image/png;base64,AA==")).toThrow();
  });
});
