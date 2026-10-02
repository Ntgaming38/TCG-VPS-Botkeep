import { z } from "zod";

const recordArray = z.array(z.record(z.string(), z.unknown())).max(2_000).default([]);

export const dataBackupRestoreSchema = z.object({
  formatVersion: z.literal("1.0"),
  exportedAt: z.string().min(1),
  scope: z.enum(["inventory", "purchases", "sales", "chyusen", "all"]),
  inventory: recordArray.optional(),
  purchases: recordArray.optional(),
  sales: recordArray.optional(),
  chyusen: z.object({
    entries: recordArray.optional(),
    sources: recordArray.optional(),
    notifications: recordArray.optional(),
    notificationSettings: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
});

export type DataBackupRestorePayload = z.infer<typeof dataBackupRestoreSchema>;

export function getDataBackupRestorePreview(payload: DataBackupRestorePayload) {
  return {
    exportedAt: payload.exportedAt,
    scope: payload.scope,
    inventoryCount: payload.inventory?.length || 0,
    purchaseCount: payload.purchases?.length || 0,
    saleCount: payload.sales?.length || 0,
    chyusenCount: payload.chyusen?.entries?.length || 0,
  };
}
