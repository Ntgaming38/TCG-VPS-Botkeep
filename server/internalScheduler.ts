import { eq } from "drizzle-orm";
import {
  chyusenMonitorConfig,
  marketplaceSyncConfig,
  snkrShopSyncConfig,
} from "../drizzle/schema";
import {
  getDb,
  getMarketplaceAutoSyncConfig,
  runMarketplaceAutoSync,
} from "./db";
import { getChyusenMonitorConfig } from "./chyusenDb";
import { runChyusenMonitor } from "./chyusenMonitor";
import {
  getSnkrShopAutoSyncConfig,
  runSnkrShopAutoSync,
  SNKR_SHOP_AUTO_SYNC_CRON,
} from "./snkrShopDb";

/**
 * In-process scheduler for the automatic sync jobs (Marketplace price sync,
 * Shop SNKR price sync, Chyusen monitor).
 *
 * The jobs were designed for the Manus Heartbeat service: an external cron
 * called POST /api/scheduled/* and each runner only proceeds when the
 * caller's task UID matches the one stored in its config row. On self-hosted
 * deployments (Botkeep) nothing calls those endpoints, so the jobs silently
 * never ran. This module makes the server its own scheduler: it registers
 * INTERNAL_SCHEDULER_TASK_UID in each job's config row (preserving the
 * user's on/off switch and batch size) and invokes the existing gated
 * runners whenever a run is due. A catch-up pass runs at startup, so a
 * restart never loses a scheduled run.
 */
export const INTERNAL_SCHEDULER_TASK_UID = "internal-scheduler";

export const MARKETPLACE_AUTO_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;
export const SNKR_SHOP_AUTO_SYNC_INTERVAL_MS = 60 * 60 * 1000;
/** Chyusen monitor keeps no lastRunAt column; its hourly cadence comes from
 * its cron expression ("0 0 * * * *"). 55 minutes keeps at least one run
 * inside every 1.15-hour deadline-reminder window. */
export const CHYUSEN_MONITOR_INTERVAL_MS = 55 * 60 * 1000;
export const SCHEDULER_TICK_MS = 5 * 60 * 1000;

const MARKETPLACE_AUTO_SYNC_CRON = "0 0 */6 * * *";
const CHYUSEN_MONITOR_CRON = "0 0 * * * *";

/** A job is due when it has never run or its last run is at least one interval old. */
export function isSyncDue(
  lastRunAt: Date | null | undefined,
  intervalMs: number,
  now: Date,
): boolean {
  if (!lastRunAt) return true;
  const last = lastRunAt.getTime();
  if (Number.isNaN(last)) return true;
  return now.getTime() - last >= intervalMs;
}

async function ensureMarketplaceSchedulerConfig(): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const config = await getMarketplaceAutoSyncConfig();
  if (!config) {
    await db.insert(marketplaceSyncConfig).values({
      scheduleCronTaskUid: INTERNAL_SCHEDULER_TASK_UID,
      cronExpression: MARKETPLACE_AUTO_SYNC_CRON,
      isEnabled: 1,
      batchSize: 12,
    });
  } else if (config.scheduleCronTaskUid !== INTERNAL_SCHEDULER_TASK_UID) {
    await db
      .update(marketplaceSyncConfig)
      .set({ scheduleCronTaskUid: INTERNAL_SCHEDULER_TASK_UID })
      .where(eq(marketplaceSyncConfig.id, config.id));
  }
  return true;
}

async function ensureSnkrShopSchedulerConfig(): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const config = await getSnkrShopAutoSyncConfig();
  if (!config) {
    await db.insert(snkrShopSyncConfig).values({
      scheduleCronTaskUid: INTERNAL_SCHEDULER_TASK_UID,
      cronExpression: SNKR_SHOP_AUTO_SYNC_CRON,
      isEnabled: 1,
      batchSize: 12,
    });
  } else if (config.scheduleCronTaskUid !== INTERNAL_SCHEDULER_TASK_UID) {
    await db
      .update(snkrShopSyncConfig)
      .set({ scheduleCronTaskUid: INTERNAL_SCHEDULER_TASK_UID })
      .where(eq(snkrShopSyncConfig.id, config.id));
  }
  return true;
}

async function ensureChyusenSchedulerConfig(): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const config = await getChyusenMonitorConfig();
  if (!config) {
    await db.insert(chyusenMonitorConfig).values({
      scheduleCronTaskUid: INTERNAL_SCHEDULER_TASK_UID,
      cronExpression: CHYUSEN_MONITOR_CRON,
      isEnabled: 1,
    });
  } else if (config.scheduleCronTaskUid !== INTERNAL_SCHEDULER_TASK_UID) {
    await db
      .update(chyusenMonitorConfig)
      .set({ scheduleCronTaskUid: INTERNAL_SCHEDULER_TASK_UID })
      .where(eq(chyusenMonitorConfig.id, config.id));
  }
  return true;
}

const inFlight = { marketplace: false, snkrShop: false, chyusen: false };
let lastChyusenRunAt: Date | null = null;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Runs every job that is due. Safe to call repeatedly; jobs never overlap. */
export async function runDueAutoSyncJobs(now: Date = new Date()): Promise<void> {
  if (!inFlight.marketplace) {
    try {
      if (await ensureMarketplaceSchedulerConfig()) {
        const config = await getMarketplaceAutoSyncConfig();
        if (
          config?.isEnabled &&
          isSyncDue(config.lastRunAt, MARKETPLACE_AUTO_SYNC_INTERVAL_MS, now)
        ) {
          inFlight.marketplace = true;
          try {
            const summary = await runMarketplaceAutoSync(INTERNAL_SCHEDULER_TASK_UID);
            if (!summary.skipped) {
              console.log(
                `[Internal scheduler] Marketplace auto sync: checked ${summary.checkedCount}, updated ${summary.updatedCount}, failed ${summary.failedCount}.`,
              );
            }
          } finally {
            inFlight.marketplace = false;
          }
        }
      }
    } catch (error) {
      console.error("[Internal scheduler] Marketplace auto sync failed:", errorMessage(error));
    }
  }

  if (!inFlight.snkrShop) {
    try {
      if (await ensureSnkrShopSchedulerConfig()) {
        const config = await getSnkrShopAutoSyncConfig();
        if (
          config?.isEnabled &&
          isSyncDue(config.lastRunAt, SNKR_SHOP_AUTO_SYNC_INTERVAL_MS, now)
        ) {
          inFlight.snkrShop = true;
          try {
            const summary = await runSnkrShopAutoSync(INTERNAL_SCHEDULER_TASK_UID);
            if (!summary.skipped) {
              console.log(
                `[Internal scheduler] Shop SNKR auto sync: checked ${summary.checkedCount}, updated ${summary.updatedCount}, failed ${summary.failedCount}.`,
              );
            }
          } finally {
            inFlight.snkrShop = false;
          }
        }
      }
    } catch (error) {
      console.error("[Internal scheduler] Shop SNKR auto sync failed:", errorMessage(error));
    }
  }

  if (!inFlight.chyusen) {
    try {
      if (await ensureChyusenSchedulerConfig()) {
        const config = await getChyusenMonitorConfig();
        if (
          config?.isEnabled &&
          isSyncDue(lastChyusenRunAt, CHYUSEN_MONITOR_INTERVAL_MS, now)
        ) {
          inFlight.chyusen = true;
          lastChyusenRunAt = now;
          try {
            const summary = await runChyusenMonitor(INTERNAL_SCHEDULER_TASK_UID);
            console.log(
              `[Internal scheduler] Chyusen monitor: checked ${summary.sourcesChecked}, changes ${summary.sourceChanges}, reminders ${summary.remindersCreated}, unavailable ${summary.unavailableSources}.`,
            );
          } catch (error) {
            // Retry on the next tick instead of waiting a full interval.
            lastChyusenRunAt = null;
            throw error;
          } finally {
            inFlight.chyusen = false;
          }
        }
      }
    } catch (error) {
      console.error("[Internal scheduler] Chyusen monitor failed:", errorMessage(error));
    }
  }
}

/** Starts the scheduler: one immediate catch-up pass, then a steady tick. */
export function startInternalScheduler(): NodeJS.Timeout {
  void runDueAutoSyncJobs();
  const timer = setInterval(() => {
    void runDueAutoSyncJobs();
  }, SCHEDULER_TICK_MS);
  timer.unref?.();
  return timer;
}
