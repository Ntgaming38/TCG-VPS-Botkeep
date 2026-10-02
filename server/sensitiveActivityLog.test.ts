import { describe, expect, it } from "vitest";
import { getSensitiveActivityLabel, SENSITIVE_ACTIVITY_ACTIONS } from "../shared/sensitiveActivityLog";

describe("sensitive activity log", () => {
  it("contains only permanent deletion and backup restore actions", () => {
    expect(SENSITIVE_ACTIVITY_ACTIONS).toEqual(["trash_purged", "backup_restored"]);
  });

  it("renders readable Vietnamese labels", () => {
    expect(getSensitiveActivityLabel("trash_purged")).toBe("Xóa vĩnh viễn");
    expect(getSensitiveActivityLabel("backup_restored")).toBe("Khôi phục dữ liệu");
  });
});
