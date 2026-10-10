import { describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ runMarketplaceAutoSync: vi.fn() }));

import { runMarketplaceAutoSync as runSync } from "./db";
import { runMarketplaceAutoSync } from "./marketplaceMonitor";

describe("Marketplace automatic sync monitor", () => {
  it("chuyển task UID của lịch nền cho batch đồng bộ an toàn", async () => {
    vi.mocked(runSync).mockResolvedValue({ checkedCount: 12, updatedCount: 10, failedCount: 2, skipped: false });

    await expect(runMarketplaceAutoSync("marketplace-task-6h")).resolves.toEqual({ checkedCount: 12, updatedCount: 10, failedCount: 2, skipped: false });
    expect(runSync).toHaveBeenCalledWith("marketplace-task-6h");
  });
});
