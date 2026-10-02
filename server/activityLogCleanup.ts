import { and, inArray, lt } from "drizzle-orm";
import { activityLogs } from "../drizzle/schema";
import { getDb } from "./db";
import { SENSITIVE_ACTIVITY_ACTIONS } from "../shared/sensitiveActivityLog";
import { getSensitiveActivityCleanupCutoff } from "../shared/activityLogCleanup";

/** Removes only sensitive audit entries older than the retention policy across all accounts. */
export async function runActivityLogCleanup() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const cutoff = getSensitiveActivityCleanupCutoff();
  const expired = await db.select({ id: activityLogs.id }).from(activityLogs)
    .where(and(inArray(activityLogs.action, [...SENSITIVE_ACTIVITY_ACTIONS]), lt(activityLogs.createdAt, cutoff)));
  if (!expired.length) return { deletedCount: 0, cutoff };
  await db.delete(activityLogs).where(inArray(activityLogs.id, expired.map((entry) => entry.id)));
  return { deletedCount: expired.length, cutoff };
}
