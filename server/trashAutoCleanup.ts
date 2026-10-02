import { emptyTrashItemsBefore, getTrashAutoCleanupSettingsByTask, recordTrashAutoCleanupRun } from "./trashDb";

export function getTrashAutoCleanupCutoff(retentionDays: number, now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - retentionDays);
  return cutoff;
}

export async function runTrashAutoCleanup(taskUid: string) {
  const settings = await getTrashAutoCleanupSettingsByTask(taskUid);
  if (!settings) return { skipped: "orphan" as const, purgedCount: 0 };
  if (!settings.isEnabled) {
    await recordTrashAutoCleanupRun(settings.id, { status: "skipped", summary: "Tự động dọn đang tắt." });
    return { skipped: "disabled" as const, purgedCount: 0 };
  }

  try {
    const result = await emptyTrashItemsBefore(settings.userId, getTrashAutoCleanupCutoff(settings.retentionDays));
    await recordTrashAutoCleanupRun(settings.id, { status: "success", summary: `Đã dọn ${result.purgedCount} mục quá ${settings.retentionDays} ngày.` });
    return { skipped: null, purgedCount: result.purgedCount, retentionDays: settings.retentionDays };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await recordTrashAutoCleanupRun(settings.id, { status: "failed", summary: message });
    throw error;
  }
}
