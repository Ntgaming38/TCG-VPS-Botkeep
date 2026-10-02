import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const schemaSource = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");
const syncSource = readFileSync(resolve(root, "server/snkrShopDb.ts"), "utf8");
const serverSource = readFileSync(resolve(root, "server/_core/index.ts"), "utf8");

describe("Shop SNKR hourly auto sync", () => {
  it("uses its own hourly schedule configuration, independent from inventory Marketplace", () => {
    expect(schemaSource).toContain('mysqlTable("snkr_shop_sync_config"');
    expect(schemaSource).toContain('default("0 0 * * * *")');
    expect(syncSource).toContain('SNKR_SHOP_AUTO_SYNC_CRON = "0 0 * * * *"');
    expect(syncSource).toContain("runSnkrShopAutoSync");
  });

  it("validates the task UID and exposes only a cron-protected scheduled callback", () => {
    expect(syncSource).toContain("config.scheduleCronTaskUid !== taskUid");
    expect(serverSource).toContain('app.post("/api/scheduled/snkr-shop-auto-sync"');
    expect(serverSource).toContain('if (!user.isCron || !user.taskUid)');
  });
});
