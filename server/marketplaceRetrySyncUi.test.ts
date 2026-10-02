import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");
const dbSource = fs.readFileSync(path.join(projectRoot, "server/db.ts"), "utf8");
const routerSource = fs.readFileSync(path.join(projectRoot, "server/routers.ts"), "utf8");
const historySource = fs.readFileSync(path.join(projectRoot, "client/src/components/SyncErrorHistory.tsx"), "utf8");
const marketplaceSource = fs.readFileSync(path.join(projectRoot, "client/src/pages/Marketplace.tsx"), "utf8");

describe("Marketplace retry sync errors", () => {
  it("rechecks an unresolved error under the current user before synchronizing its product", () => {
    expect(dbSource).toContain("export async function retryMarketplaceSyncError(errorId: number, userId: number)");
    expect(dbSource).toContain("eq(marketplaceSyncErrors.id, errorId)");
    expect(dbSource).toContain("eq(marketplaceSyncErrors.userId, userId)");
    expect(dbSource).toContain("return syncSnkrdunkPriceForProduct(syncError.productId, userId)");
    expect(routerSource).toContain("retrySyncError: protectedProcedure");
  });

  it("shows a retry action only for unresolved URLs and refreshes the error history", () => {
    expect(historySource).toContain('entry.resolvedAt ? <span className="text-muted-foreground">—</span>');
    expect(historySource).toContain('"Thử lại"');
    expect(historySource).toContain("retryingId === entry.id");
    expect(marketplaceSource).toContain("trpc.products.retrySyncError.useMutation");
    expect(marketplaceSource).toContain("utils.products.syncErrorHistory.invalidate()");
  });
});
