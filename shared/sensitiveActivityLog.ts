export const SENSITIVE_ACTIVITY_ACTIONS = ["trash_purged", "backup_restored"] as const;

export type SensitiveActivityAction = typeof SENSITIVE_ACTIVITY_ACTIONS[number];

export function getSensitiveActivityLabel(action: string) {
  if (action === "trash_purged") return "Xóa vĩnh viễn";
  if (action === "backup_restored") return "Khôi phục dữ liệu";
  return "Thao tác dữ liệu";
}
