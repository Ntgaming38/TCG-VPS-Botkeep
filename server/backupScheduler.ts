import { desc, eq } from "drizzle-orm";
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

async function runBackupForUser(settings: { id: number; userId: number }, database: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  try {
    const snapshot = await saveSnapshot(settings.userId, "scheduled");
    const summary = `Đã tạo ${snapshot.fileName} (${Math.ceil(snapshot.fileSize / 1024)} KB).`;
    await database.update(autoBackupSettings).set({ lastRunAt: new Date(), lastRunStatus: "success", lastRunSummary: summary }).where(eq(autoBackupSettings.id, settings.id));
    return { status: "success" as const, summary };
  } catch (error) {
    const summary = error instanceof Error ? error.message.slice(0, 1000) : String(error).slice(0, 1000);
    await database.update(autoBackupSettings).set({ lastRunAt: new Date(), lastRunStatus: "failed", lastRunSummary: summary }).where(eq(autoBackupSettings.id, settings.id));
    throw error;
  }
}

export async function runScheduledAutoBackup(taskUid: string) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  // Cron của VPS ("selfhost-cron") chạy cho mọi tài khoản đã bật sao lưu tự động.
  if (taskUid === "selfhost-cron") {
    const enabled = await database.select().from(autoBackupSettings).where(eq(autoBackupSettings.isEnabled, 1));
    if (!enabled.length) return { status: "skipped" as const, summary: "Chưa có tài khoản nào bật sao lưu tự động." };
    const now = Date.now();
    const dueSettings = enabled.filter((settings) => {
      if (!settings.lastRunAt) return true;
      // Weekly: sau 7 ngày; monthly: sau 28 ngày (an toàn cho cả tháng 28/29/30/31 ngày).
      const intervalMs = (settings.frequency === "monthly" ? 28 : 7) * 24 * 60 * 60 * 1000;
      return now - new Date(settings.lastRunAt).getTime() >= intervalMs;
    });
    if (!dueSettings.length) return { status: "skipped" as const, summary: "Chưa tới hạn sao lưu cho tài khoản nào." };
    let successCount = 0;
    let failedCount = 0;
    for (const settings of dueSettings) {
      try {
        await runBackupForUser(settings, database);
        successCount += 1;
      } catch {
        failedCount += 1;
      }
    }
    return { status: failedCount ? ("partial" as const) : ("success" as const), summary: `Sao lưu tự động: ${successCount} thành công, ${failedCount} thất bại.` };
  }

  const settings = await getAutoBackupSettingsByTask(taskUid);
  if (!settings) return { status: "skipped" as const, summary: "Không tìm thấy cấu hình sao lưu." };
  if (!settings.isEnabled) return { status: "skipped" as const, summary: "Sao lưu tự động đang tắt." };
  return runBackupForUser(settings, database);
}

export async function createManualStoredBackup(userId: number) {
  return saveSnapshot(userId, "manual");
}
