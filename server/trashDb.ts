import { and, desc, eq, inArray, isNull, lt } from "drizzle-orm";
import { activityLogs, chyusenEntries, chyusenNotifications, trashAutoCleanupSettings, trashItems } from "../drizzle/schema";
import { getDb } from "./db";

export type TrashEntityType = "product" | "purchase" | "sale" | "chyusen" | "source" | "notification";

export async function createTrashItem(userId: number, input: {
  entityType: TrashEntityType;
  entityId: number;
  title: string;
  snapshot: unknown;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(trashItems).values({
    userId,
    entityType: input.entityType,
    entityId: input.entityId,
    title: input.title,
    snapshot: JSON.stringify(input.snapshot),
  });
  return { id: result[0].insertId };
}

export async function listTrashItems(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: trashItems.id,
    entityType: trashItems.entityType,
    entityId: trashItems.entityId,
    title: trashItems.title,
    deletedAt: trashItems.deletedAt,
  }).from(trashItems)
    .where(and(eq(trashItems.userId, userId), isNull(trashItems.restoredAt)))
    .orderBy(desc(trashItems.deletedAt));
}

export async function getTrashItem(userId: number, trashId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [item] = await db.select().from(trashItems)
    .where(and(eq(trashItems.id, trashId), eq(trashItems.userId, userId), isNull(trashItems.restoredAt)))
    .limit(1);
  if (!item) throw new Error("Mục Thùng rác không tồn tại hoặc đã được khôi phục.");
  return item;
}

export async function markTrashItemRestored(userId: number, trashId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(trashItems).set({ restoredAt: new Date() })
    .where(and(eq(trashItems.id, trashId), eq(trashItems.userId, userId), isNull(trashItems.restoredAt)));
}

export async function markLatestTrashItemRestored(userId: number, entityType: TrashEntityType, entityId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [item] = await db.select({ id: trashItems.id }).from(trashItems)
    .where(and(eq(trashItems.userId, userId), eq(trashItems.entityType, entityType), eq(trashItems.entityId, entityId), isNull(trashItems.restoredAt)))
    .orderBy(desc(trashItems.deletedAt))
    .limit(1);
  if (item) await markTrashItemRestored(userId, item.id);
}

export async function emptyTrashItems(userId: number, itemIds?: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const requestedIds = itemIds ? Array.from(new Set(itemIds)) : undefined;
  const items = (await listTrashItems(userId)).filter((item) => !requestedIds || requestedIds.includes(item.id));
  return permanentlyRemoveTrashItems(userId, items);
}

async function permanentlyRemoveTrashItems(userId: number, items: Awaited<ReturnType<typeof listTrashItems>>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!items.length) return { purgedCount: 0 };

  const chyusenIds = items.filter((item) => item.entityType === "chyusen").map((item) => item.entityId);
  const notificationIds = items.filter((item) => item.entityType === "notification").map((item) => item.entityId);
  if (chyusenIds.length) {
    await db.delete(chyusenNotifications).where(and(eq(chyusenNotifications.userId, userId), inArray(chyusenNotifications.entryId, chyusenIds)));
    await db.delete(chyusenEntries).where(and(eq(chyusenEntries.userId, userId), inArray(chyusenEntries.id, chyusenIds)));
  }
  if (notificationIds.length) await db.delete(chyusenNotifications).where(and(eq(chyusenNotifications.userId, userId), inArray(chyusenNotifications.id, notificationIds)));
  await db.delete(trashItems).where(and(eq(trashItems.userId, userId), isNull(trashItems.restoredAt), inArray(trashItems.id, items.map((item) => item.id))));
  const types = Array.from(new Set(items.map((item) => item.entityType))).join(", ");
  await db.insert(activityLogs).values({ userId, action: "trash_purged", description: `Xóa vĩnh viễn ${items.length} mục trong Thùng rác${types ? ` (${types})` : ""}.`, entityType: "trash" });
  return { purgedCount: items.length };
}

export async function emptyTrashItemsBefore(userId: number, cutoff: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const items = await db.select({
    id: trashItems.id,
    entityType: trashItems.entityType,
    entityId: trashItems.entityId,
    title: trashItems.title,
    deletedAt: trashItems.deletedAt,
  }).from(trashItems).where(and(eq(trashItems.userId, userId), isNull(trashItems.restoredAt), lt(trashItems.deletedAt, cutoff)));
  return permanentlyRemoveTrashItems(userId, items);
}

const DEFAULT_RETENTION_DAYS = 30;
export const TRASH_AUTO_CLEANUP_CRON = "0 0 18 * * *";

export async function getTrashAutoCleanupSettings(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [settings] = await db.select().from(trashAutoCleanupSettings).where(eq(trashAutoCleanupSettings.userId, userId)).limit(1);
  return settings;
}

export async function getTrashAutoCleanupSettingsByTask(taskUid: string) {
  const db = await getDb();
  if (!db) return undefined;
  const [settings] = await db.select().from(trashAutoCleanupSettings).where(eq(trashAutoCleanupSettings.scheduleCronTaskUid, taskUid)).limit(1);
  return settings;
}

export async function saveTrashAutoCleanupSettings(userId: number, input: { isEnabled?: boolean; retentionDays?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const current = await getTrashAutoCleanupSettings(userId);
  const update = {
    isEnabled: input.isEnabled === undefined ? current?.isEnabled ?? 0 : input.isEnabled ? 1 : 0,
    retentionDays: input.retentionDays === undefined ? current?.retentionDays ?? DEFAULT_RETENTION_DAYS : Math.min(Math.max(Math.round(input.retentionDays), 1), 365),
  };
  if (current) {
    await db.update(trashAutoCleanupSettings).set(update).where(eq(trashAutoCleanupSettings.id, current.id));
  } else {
    await db.insert(trashAutoCleanupSettings).values({ userId, cronExpression: TRASH_AUTO_CLEANUP_CRON, ...update });
  }
  return getTrashAutoCleanupSettings(userId);
}

export async function setTrashAutoCleanupTask(userId: number, taskUid: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const current = await getTrashAutoCleanupSettings(userId);
  if (current) {
    await db.update(trashAutoCleanupSettings).set({ scheduleCronTaskUid: taskUid, cronExpression: TRASH_AUTO_CLEANUP_CRON }).where(eq(trashAutoCleanupSettings.id, current.id));
  } else {
    await db.insert(trashAutoCleanupSettings).values({ userId, scheduleCronTaskUid: taskUid, cronExpression: TRASH_AUTO_CLEANUP_CRON, isEnabled: 0, retentionDays: DEFAULT_RETENTION_DAYS });
  }
  return getTrashAutoCleanupSettings(userId);
}

export async function recordTrashAutoCleanupRun(settingsId: number, input: { status: "success" | "failed" | "skipped"; summary: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(trashAutoCleanupSettings).set({ lastRunAt: new Date(), lastRunStatus: input.status, lastRunSummary: input.summary }).where(eq(trashAutoCleanupSettings.id, settingsId));
}
