import * as db from "./db";
import * as chyusenDb from "./chyusenDb";
import * as snkrShopDb from "./snkrShopDb";
import { listTrashItemsForBackup } from "./trashDb";
import { getReportBranding } from "./reportBranding";
import { createDataBackupPayload } from "@shared/dataBackupExport";

export async function createFullUserBackup(userId: number) {
  const [
    inventory,
    purchases,
    sales,
    entries,
    sources,
    notifications,
    notificationSettings,
    shops,
    saleLocations,
    snkrShopItems,
    trash,
    branding,
    user,
    activityLogs,
  ] = await Promise.all([
    db.listProducts(userId, { status: "all" }),
    db.listPurchases(userId),
    db.listSales(userId),
    chyusenDb.listChyusenEntries(userId),
    chyusenDb.listChyusenSources(userId),
    chyusenDb.listChyusenNotifications(userId),
    chyusenDb.getChyusenNotificationSettings(userId),
    db.listShops(userId),
    db.listSaleLocations(userId),
    snkrShopDb.listSnkrShopItems(userId),
    listTrashItemsForBackup(userId),
    getReportBranding(userId),
    db.getUserById(userId),
    db.listAllActivityLogsForBackup(userId),
  ]);

  return createDataBackupPayload("all", {
    inventory,
    purchases,
    sales,
    chyusen: { entries, sources, notifications, notificationSettings },
    shops,
    saleLocations,
    snkrShop: { items: snkrShopItems },
    trash,
    reportBranding: branding ? { accentColor: branding.accentColor, logoUrl: branding.logoUrl } : null,
    userProfile: user ? { nickname: user.nickname ?? null, avatarUrl: user.avatarUrl ?? null, avatarBorderColor: user.avatarBorderColor ?? null, language: user.language ?? null, currency: user.currency ?? null } : null,
    activityLogs,
  });
}
