export const PERMANENT_DELETE_CONFIRMATION = "XÓA VĨNH VIỄN";
export const BACKUP_RESTORE_CONFIRMATION = "KHÔI PHỤC";

export function isDestructiveConfirmationValid(value: string, requiredPhrase: string) {
  return value.trim() === requiredPhrase;
}
