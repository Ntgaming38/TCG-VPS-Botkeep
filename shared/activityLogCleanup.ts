export const SENSITIVE_ACTIVITY_RETENTION_DAYS = 30;

export function getSensitiveActivityCleanupCutoff(now = new Date()) {
  return new Date(now.getTime() - SENSITIVE_ACTIVITY_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}
