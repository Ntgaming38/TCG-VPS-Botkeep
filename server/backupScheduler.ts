import { and, desc, eq } from "drizzle-orm";
import { autoBackupSettings, backupArchives, backupRestoreHistory } from "../drizzle/schema";
import { getDb } from "./db";
import { createFullUserBackup } from "./backupData";
import { storagePut } from "./storage";

export type AutoBackupFrequency = "weekly" | "monthly";
export const AUTO_BACKUP_CRON: Record<AutoBackupFrequency, string> = {
  weekly: "0 0 3 * * 0",
  monthly: "0 0 3 1 * *",
};

const getFileName = () => `tcg-manager-tu-dong-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;

export async function getAutoBackupSettings(userId: number) {
  const database = await getDb();
  if (!database) return undefined;
  const [settings] = await database.select().from(autoBackupSettings).where(eq(autoBackupSettings.userId, userId)).limit(1);
  return settings;
}

export async function getAutoBackupSettingsByTask(taskUid: string) {
  const database = await getDb();
  if (!database) return undefined;
  const [settings] = await database.select().from(autoBackupSettings).where(eq(autoBackupSettings.scheduleCronTaskUid, taskUid)).limit(1);
  return settings;
}

export async function saveAutoBackupSettings(userId: number, input: { frequency?: AutoBackupFrequency; isEnabled?: boolean }) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const current = await getAutoBackupSettings(userId);
  const frequency = input.frequency || current?.frequency || "weekly";
  const update = { frequency, cronExpression: AUTO_BACKUP_CRON[frequency], isEnabled: input.isEnabled === undefined ? current?.isEnabled ?? 0 : input.isEnabled ? 1 : 0 };
  if (current) await database.update(autoBackupSettings).set(update).where(eq(autoBackupSettings.id, current.id));
  else await database.insert(autoBackupSettings).values({ userId, ...update });
  return getAutoBackupSettings(userId);
}

export async function setAutoBackupTask(userId: number, taskUid: string) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const current = await getAutoBackupSettings(userId);
  if (current) await database.update(autoBackupSettings).set({ scheduleCronTaskUid: taskUid }).where(eq(autoBackupSettings.id, current.id));
  else await database.insert(autoBackupSettings).values({ userId, scheduleCronTaskUid: taskUid, isEnabled: 0, frequency: "weekly", cronExpression: AUTO_BACKUP_CRON.weekly });
  return getAutoBackupSettings(userId);
}

export async function listBackupArchives(userId: number, limit = 10) {
  const database = await getDb();
  if (!database) return [];
  return database.select().from(backupArchives).where(eq(backupArchives.userId, userId)).orderBy(desc(backupArchives.createdAt)).limit(limit);
}

export async function listBackupRestoreHistory(userId: number, limit = 10) {
  const database = await getDb();
  if (!database) return [];
  return database.select().from(backupRestoreHistory).where(eq(backupRestoreHistory.userId, userId)).orderBy(desc(backupRestoreHistory.restoredAt)).limit(limit);
}

async function saveSnapshot(userId: number, source: "scheduled" | "manual" = "scheduled") {
  const payload = await createFullUserBackup(userId);
  const content = JSON.stringify(payload, null, 2);
  const fileName = getFileName();
  const stored = await storagePut(`data-backups/${userId}/${fileName}`, content, "application/json");
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  await database.insert(backupArchives).values({ userId, fileName, storageKey: stored.key, fileUrl: stored.url, fileSize: Buffer.byteLength(content, "utf8"), source });
  return { fileName, fileUrl: stored.url, fileSize: Buffer.byteLength(content, "utf8") };
}

export async function runScheduledAutoBackup(taskUid: string) {
  const settings = await getAutoBackupSettingsByTask(taskUid);
  if (!settings) return { status: "skipped" as const, summary: "Không tìm thấy cấu hình sao lưu." };
  if (!settings.isEnabled) return { status: "skipped" as const, summary: "Sao lưu tự động đang tắt." };
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  try {
    const snapshot = await saveSnapshot(settings.userId, "scheduled");
    const summary = `Đã tạo ${snapshot.fileName} (${Math.ceil(snapshot.fileSize / 1024)} KB).`;
    await database.update(autoBackupSettings).set({ lastRunAt: new Date(), lastRunStatus: "success", lastRunSummary: summary }).where(and(eq(autoBackupSettings.id, settings.id), eq(autoBackupSettings.scheduleCronTaskUid, taskUid)));
    return { status: "success" as const, summary };
  } catch (error) {
    const summary = error instanceof Error ? error.message.slice(0, 1000) : String(error).slice(0, 1000);
    await database.update(autoBackupSettings).set({ lastRunAt: new Date(), lastRunStatus: "failed", lastRunSummary: summary }).where(and(eq(autoBackupSettings.id, settings.id), eq(autoBackupSettings.scheduleCronTaskUid, taskUid)));
    throw error;
  }
}

export async function createManualStoredBackup(userId: number) {
  return saveSnapshot(userId, "manual");
}
