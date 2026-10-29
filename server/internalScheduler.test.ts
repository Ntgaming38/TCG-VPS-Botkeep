import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CHYUSEN_MONITOR_INTERVAL_MS,
  INTERNAL_SCHEDULER_TASK_UID,
  isSyncDue,
  MARKETPLACE_AUTO_SYNC_INTERVAL_MS,
  SCHEDULER_TICK_MS,
  SNKR_SHOP_AUTO_SYNC_INTERVAL_MS,
} from "./internalScheduler";

const root = resolve(import.meta.dirname, "..");
const schedulerSource = readFileSync(resolve(root, "server/internalScheduler.ts"), "utf8");
const serverSource = readFileSync(resolve(root, "server/_core/index.ts"), "utf8");

describe("Internal scheduler due checks", () => {
  const now = new Date("2026-10-29T12:00:00Z");
  const sixHours = 6 * 60 * 60 * 1000;

  it("treats a job that never ran as due", () => {
    expect(isSyncDue(null, sixHours, now)).toBe(true);
    expect(isSyncDue(undefined, sixHours, now)).toBe(true);
  });

  it("is not due before the interval has elapsed", () => {
    expect(isSyncDue(new Date(now.getTime() - sixHours + 1), sixHours, now)).toBe(false);
    expect(isSyncDue(new Date(now.getTime() - 60 * 1000), sixHours, now)).toBe(false);
  });

  it("is due once the interval has fully elapsed", () => {
    expect(isSyncDue(new Date(now.getTime() - sixHours), sixHours, now)).toBe(true);
    expect(isSyncDue(new Date(now.getTime() - sixHours * 3), sixHours, now)).toBe(true);
  });

  it("uses the cadence each job promises in the UI", () => {
    expect(MARKETPLACE_AUTO_SYNC_INTERVAL_MS).toBe(6 * 60 * 60 * 1000);
    expect(SNKR_SHOP_AUTO_SYNC_INTERVAL_MS).toBe(60 * 60 * 1000);
    expect(CHYUSEN_MONITOR_INTERVAL_MS).toBeLessThan(60 * 60 * 1000);
    expect(SCHEDULER_TICK_MS).toBeLessThanOrEqual(5 * 60 * 1000);
    // scheduleCronTaskUid columns are varchar(65).
    expect(INTERNAL_SCHEDULER_TASK_UID.length).toBeLessThanOrEqual(65);
  });
});

describe("Internal scheduler wiring", () => {
  it("registers itself as the scheduler task and calls the existing gated runners", () => {
    expect(schedulerSource).toContain("runMarketplaceAutoSync(INTERNAL_SCHEDULER_TASK_UID)");
    expect(schedulerSource).toContain("runSnkrShopAutoSync(INTERNAL_SCHEDULER_TASK_UID)");
    expect(schedulerSource).toContain("runChyusenMonitor(INTERNAL_SCHEDULER_TASK_UID)");
    // Registration only replaces the task UID; the user's on/off switch and
    // batch size on an existing config row are never overwritten.
    expect(schedulerSource).toContain(".set({ scheduleCronTaskUid: INTERNAL_SCHEDULER_TASK_UID })");
    expect(schedulerSource).not.toContain(".set({ scheduleCronTaskUid: INTERNAL_SCHEDULER_TASK_UID, isEnabled");
  });

  it("is started by the server alongside the scheduled endpoints", () => {
    expect(serverSource).toContain("startInternalScheduler()");
    expect(serverSource).toContain('app.post("/api/scheduled/marketplace-auto-sync"');
    expect(serverSource).toContain('app.post("/api/scheduled/snkr-shop-auto-sync"');
    expect(serverSource).toContain('app.post("/api/scheduled/chyusen-monitor"');
  });
});
