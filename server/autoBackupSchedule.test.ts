import { describe, expect, it } from "vitest";
import { findExistingAutoBackupTask } from "../shared/autoBackupSchedule";

describe("auto backup schedule reuse", () => {
  it("reuses an existing per-user auto-backup task", () => {
    expect(findExistingAutoBackupTask([{ name: "other", taskUid: "other-task" }, { name: "auto-backup-1", taskUid: "existing-task" }], 1)).toBe("existing-task");
  });

  it("does not reuse a different user's task", () => {
    expect(findExistingAutoBackupTask([{ name: "auto-backup-2", taskUid: "other-task" }], 1)).toBeUndefined();
  });
});
