type HeartbeatSchedule = { name: string; taskUid: string };

export function findExistingAutoBackupTask(jobs: HeartbeatSchedule[], userId: number) {
  return jobs.find((job) => job.name === `auto-backup-${userId}`)?.taskUid;
}
