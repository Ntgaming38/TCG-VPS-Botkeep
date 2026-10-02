import { describe, expect, it } from "vitest";
import { BACKUP_RESTORE_CONFIRMATION, isDestructiveConfirmationValid, PERMANENT_DELETE_CONFIRMATION } from "../shared/destructiveConfirmation";

describe("destructive confirmations", () => {
  it("requires the exact delete phrase", () => {
    expect(isDestructiveConfirmationValid(PERMANENT_DELETE_CONFIRMATION, PERMANENT_DELETE_CONFIRMATION)).toBe(true);
    expect(isDestructiveConfirmationValid("Xóa vĩnh viễn", PERMANENT_DELETE_CONFIRMATION)).toBe(false);
  });

  it("keeps the backup restore phrase distinct from permanent deletion", () => {
    expect(isDestructiveConfirmationValid(BACKUP_RESTORE_CONFIRMATION, BACKUP_RESTORE_CONFIRMATION)).toBe(true);
    expect(isDestructiveConfirmationValid(BACKUP_RESTORE_CONFIRMATION, PERMANENT_DELETE_CONFIRMATION)).toBe(false);
  });
});
