import { and, eq } from "drizzle-orm";
import { activityLogs, backupRestoreHistory, chyusenEntries, chyusenSources, products, purchases, sales } from "../drizzle/schema";
import { getDb } from "./db";
import type { DataBackupRestorePayload } from "@shared/dataBackupRestore";
import { updateChyusenNotificationSettings } from "./chyusenDb";

type BackupRow = Record<string, unknown>;

const productTypes = new Set(["card", "box", "pack", "junk_pack"]);
const purchaseTypes = new Set(["mua_le", "coc_5", "coc_10", "coc_30"]);
const purchaseStatuses = new Set(["paid", "received", "pending", "cancelled"]);
const salePlatforms = new Set(["snkrdunk", "mercari", "yahoo", "shop", "offline", "other"]);
const productStatuses = new Set(["in_stock", "sold", "reserved", "traded", "damaged"]);

function asText(value: unknown, max = 10_000) {
  return typeof value === "string" ? value.slice(0, max) : null;
}

function asNumber(value: unknown, fallback = 0) {
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
}

function asInteger(value: unknown, fallback = 0) {
  return Math.max(0, Math.trunc(asNumber(value, fallback)));
}

function asDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

function backupProduct(row: BackupRow, userId: number) {
  const type = typeof row.type === "string" && productTypes.has(row.type) ? row.type : null;
  const name = asText(row.name, 255)?.trim();
  if (!name || !type) return null;
  const quantity = asInteger(row.quantity);
  const damagedQuantity = Math.min(quantity, asInteger(row.damagedQuantity));
  const status = typeof row.status === "string" && productStatuses.has(row.status) ? row.status : quantity === 0 ? "sold" : "in_stock";
  return {
    userId,
    name,
    type: type as "card" | "box" | "pack" | "junk_pack",
    series: asText(row.series, 100) || "Pokemon",
    setName: asText(row.setName, 255),
    image: asText(row.image),
    description: asText(row.description),
    cardNumber: asText(row.cardNumber, 50),
    language: asText(row.language, 20) || "Japanese",
    rarity: asText(row.rarity, 50),
    condition: asText(row.condition, 50) || "A",
    psaGrade: asText(row.psaGrade, 20),
    releaseDate: asText(row.releaseDate, 20),
    quantity,
    damagedQuantity,
    damageNote: asText(row.damageNote),
    buyPrice: String(asNumber(row.buyPrice)),
    marketPrice: String(asNumber(row.marketPrice)),
    snkrdunkUrl: asText(row.snkrdunkUrl),
    snkrdunkLastSyncedAt: row.snkrdunkLastSyncedAt ? asDate(row.snkrdunkLastSyncedAt) : null,
    sellPrice: String(asNumber(row.sellPrice)),
    status: status as "in_stock" | "sold" | "reserved" | "traded" | "damaged",
  };
}

export async function restoreDataBackup(userId: number, payload: DataBackupRestorePayload, sourceFileName = "Sao lưu TCG Manager.json") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const productIdMap = new Map<number, number>();
  let restoredProducts = 0;
  let restoredPurchases = 0;
  let restoredSales = 0;
  let restoredChyusen = 0;
  let restoredSources = 0;
  const chyusenEntryIdMap = new Map<number, number>();

  for (const row of payload.inventory || []) {
    const product = backupProduct(row, userId);
    if (!product) continue;
    const existing = await db.select({ id: products.id }).from(products).where(and(eq(products.userId, userId), eq(products.name, product.name), eq(products.type, product.type), eq(products.buyPrice, product.buyPrice))).limit(1);
    const productId = existing[0]?.id;
    if (productId) {
      await db.update(products).set(product).where(eq(products.id, productId));
      if (typeof row.id === "number") productIdMap.set(row.id, productId);
      restoredProducts += 1;
      continue;
    }
    const inserted = await db.insert(products).values(product);
    const nextId = inserted[0].insertId;
    if (typeof row.id === "number") productIdMap.set(row.id, nextId);
    restoredProducts += 1;
  }

  for (const row of payload.purchases || []) {
    const originalProductId = asInteger(row.productId, -1);
    const productId = productIdMap.get(originalProductId);
    if (!productId) continue;
    const purchaseDate = asDate(row.purchaseDate);
    const duplicate = await db.select({ id: purchases.id }).from(purchases).where(and(eq(purchases.userId, userId), eq(purchases.productId, productId), eq(purchases.purchaseDate, purchaseDate))).limit(1);
    if (duplicate[0]) continue;
    const purchaseType = typeof row.purchaseType === "string" && purchaseTypes.has(row.purchaseType) ? row.purchaseType : "mua_le";
    const status = typeof row.status === "string" && purchaseStatuses.has(row.status) ? row.status : "received";
    const totalPrice = asNumber(row.totalPrice ?? row.price);
    await db.insert(purchases).values({ userId, productId, shop: asText(row.shop, 255), purchaseType: purchaseType as "mua_le" | "coc_5" | "coc_10" | "coc_30", quantity: Math.max(1, asInteger(row.quantity, 1)), price: String(asNumber(row.price, totalPrice)), totalPrice: String(totalPrice), note: asText(row.note), status: status as "paid" | "received" | "pending" | "cancelled", purchaseDate });
    restoredPurchases += 1;
  }

  for (const row of payload.sales || []) {
    const originalProductId = asInteger(row.productId, -1);
    const productId = productIdMap.get(originalProductId);
    if (!productId) continue;
    const saleDate = asDate(row.saleDate);
    const duplicate = await db.select({ id: sales.id }).from(sales).where(and(eq(sales.userId, userId), eq(sales.productId, productId), eq(sales.saleDate, saleDate))).limit(1);
    if (duplicate[0]) continue;
    const platform = typeof row.platform === "string" && salePlatforms.has(row.platform) ? row.platform : "other";
    const revenue = asNumber(row.totalRevenue ?? row.salePrice);
    await db.insert(sales).values({ userId, productId, quantity: Math.max(1, asInteger(row.quantity, 1)), salePrice: String(asNumber(row.salePrice, revenue)), totalRevenue: String(revenue), platform: platform as "snkrdunk" | "mercari" | "yahoo" | "shop" | "offline" | "other", fee: String(asNumber(row.fee)), shippingFee: String(asNumber(row.shippingFee)), otherCost: String(asNumber(row.otherCost)), profit: String(asNumber(row.profit)), note: asText(row.note), saleDate });
    restoredSales += 1;
  }

  for (const row of payload.chyusen?.entries || []) {
    const title = asText(row.title, 255)?.trim();
    const productName = asText(row.productName, 255)?.trim();
    if (!title || !productName) continue;
    const sourceUrl = asText(row.sourceUrl);
    const duplicate = await db.select({ id: chyusenEntries.id }).from(chyusenEntries).where(and(eq(chyusenEntries.userId, userId), eq(chyusenEntries.title, title), sourceUrl ? eq(chyusenEntries.sourceUrl, sourceUrl) : eq(chyusenEntries.productName, productName))).limit(1);
    if (duplicate[0]) continue;
    const inserted = await db.insert(chyusenEntries).values({ userId, title, productName, series: asText(row.series, 100) || "Pokemon", productType: (asText(row.productType, 20) || "other") as "card" | "box" | "pack" | "set" | "other", shop: asText(row.shop, 100) || "Khác", customShopName: asText(row.customShopName, 255), sourceUrl, externalProductId: asText(row.externalProductId, 255), imageUrl: asText(row.imageUrl), price: row.price == null ? null : String(asNumber(row.price)), quantityLimit: asText(row.quantityLimit, 100), applicationStart: row.applicationStart ? asDate(row.applicationStart) : null, applicationEnd: row.applicationEnd ? asDate(row.applicationEnd) : null, resultDate: row.resultDate ? asDate(row.resultDate) : null, pickupStart: row.pickupStart ? asDate(row.pickupStart) : null, pickupEnd: row.pickupEnd ? asDate(row.pickupEnd) : null, pickupNote: asText(row.pickupNote, 500), requirements: asText(row.requirements), applicationStatus: (asText(row.applicationStatus, 32) || "not_registered") as "not_registered" | "registered" | "cancelled" | "won" | "lost" | "not_participating", resultStatus: (asText(row.resultStatus, 32) || "pending") as "pending" | "won" | "lost" | "unknown", sourceTimezone: asText(row.sourceTimezone, 64) || "Asia/Tokyo", parserStatus: (asText(row.parserStatus, 32) || "manual") as "manual" | "partial" | "detected" | "unavailable", parserNote: asText(row.parserNote), fieldConfidence: typeof row.fieldConfidence === "string" ? row.fieldConfidence : row.fieldConfidence ? JSON.stringify(row.fieldConfidence) : null, sourceContentHash: asText(row.sourceContentHash, 64), lastCheckedAt: row.lastCheckedAt ? asDate(row.lastCheckedAt) : null, resultCheckedAt: row.resultCheckedAt ? asDate(row.resultCheckedAt) : null, purchaseCreatedAt: row.purchaseCreatedAt ? asDate(row.purchaseCreatedAt) : null, deletedAt: row.deletedAt ? asDate(row.deletedAt) : null });
    if (typeof row.id === "number") chyusenEntryIdMap.set(row.id, inserted[0].insertId);
    restoredChyusen += 1;
  }

  for (const row of payload.chyusen?.sources || []) {
    const sourceUrl = asText(row.sourceUrl, 2048)?.trim();
    if (!sourceUrl) continue;
    const existing = await db.select({ id: chyusenSources.id }).from(chyusenSources).where(and(eq(chyusenSources.userId, userId), eq(chyusenSources.sourceUrl, sourceUrl))).limit(1);
    if (existing[0]) continue;
    const interval = [60, 180, 360, 720, 1440].includes(asInteger(row.checkIntervalMinutes, 360)) ? asInteger(row.checkIntervalMinutes, 360) : 360;
    const originalEntryId = typeof row.entryId === "number" ? Math.trunc(row.entryId) : -1;
    const sourceEntryId = chyusenEntryIdMap.get(originalEntryId);
    await db.insert(chyusenSources).values({ userId, entryId: sourceEntryId || null, sourceUrl, label: asText(row.label, 255), isActive: asInteger(row.isActive, 1) ? 1 : 0, checkIntervalMinutes: interval, latestStatus: "monitoring" });
    restoredSources += 1;
  }

  const notificationSettings = payload.chyusen?.notificationSettings;
  if (notificationSettings) {
    const readBoolean = (key: string) => typeof notificationSettings[key] === "number" ? Boolean(notificationSettings[key]) : typeof notificationSettings[key] === "boolean" ? notificationSettings[key] : undefined;
    const deadlineHours = Array.isArray(notificationSettings.deadlineHours) ? notificationSettings.deadlineHours.filter((value): value is number => typeof value === "number") : undefined;
    await updateChyusenNotificationSettings(userId, { lotteryNew: readBoolean("lotteryNew"), lotteryExpiring: readBoolean("lotteryExpiring"), lotteryResult: readBoolean("lotteryResult"), lotteryChanged: readBoolean("lotteryChanged"), lotteryWon: readBoolean("lotteryWon"), lotteryLost: readBoolean("lotteryLost"), soundNewEnabled: readBoolean("soundNewEnabled"), soundUrgentEnabled: readBoolean("soundUrgentEnabled"), quietHoursEnabled: readBoolean("quietHoursEnabled"), deadlineHours, quietStart: asText(notificationSettings.quietStart, 5) || undefined, quietEnd: asText(notificationSettings.quietEnd, 5) || undefined });
  }

  await db.insert(activityLogs).values({ userId, action: "backup_restored", description: `Khôi phục sao lưu: ${restoredProducts} sản phẩm, ${restoredPurchases} mua, ${restoredSales} bán, ${restoredChyusen} Chyusen, ${restoredSources} nguồn`, entityType: "backup" });
  await db.insert(backupRestoreHistory).values({ userId, sourceFileName: sourceFileName.slice(0, 255), scope: payload.scope, restoredProducts, restoredPurchases, restoredSales, restoredChyusen, restoredSources });
  return { restoredProducts, restoredPurchases, restoredSales, restoredChyusen, restoredSources };
}
