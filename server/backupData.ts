import * as db from "./db";
import * as chyusenDb from "./chyusenDb";
import { createDataBackupPayload } from "@shared/dataBackupExport";

export async function createFullUserBackup(userId: number) {
  const [inventory, purchases, sales, entries, sources, notifications, notificationSettings] = await Promise.all([
    db.listProducts(userId, { status: "all" }),
    db.listPurchases(userId),
    db.listSales(userId),
    chyusenDb.listChyusenEntries(userId),
    chyusenDb.listChyusenSources(userId),
    chyusenDb.listChyusenNotifications(userId),
    chyusenDb.getChyusenNotificationSettings(userId),
  ]);

  return createDataBackupPayload("all", {
    inventory,
    purchases,
    sales,
    chyusen: { entries, sources, notifications, notificationSettings },
  });
}
