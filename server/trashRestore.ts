import { and, eq } from "drizzle-orm";
import { chyusenEntries, chyusenNotifications, chyusenSources, products, purchases, sales } from "../drizzle/schema";
import { getDb } from "./db";
import { getTrashItem, markTrashItemRestored, type TrashEntityType } from "./trashDb";

type SnapshotRecord = Record<string, unknown>;

function hydrateDates(record: SnapshotRecord, dateKeys: string[]) {
  const hydrated = { ...record };
  for (const key of dateKeys) {
    if (typeof hydrated[key] === "string") hydrated[key] = new Date(hydrated[key] as string);
  }
  return hydrated;
}

async function restoreProduct(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, snapshot: SnapshotRecord) {
  const product = hydrateDates(snapshot.product as SnapshotRecord, ["createdAt", "updatedAt"]);
  await db.insert(products).values(product as any);
  const purchaseRows = Array.isArray(snapshot.purchases) ? snapshot.purchases as SnapshotRecord[] : [];
  const saleRows = Array.isArray(snapshot.sales) ? snapshot.sales as SnapshotRecord[] : [];
  if (purchaseRows.length) await db.insert(purchases).values(purchaseRows.map((row) => hydrateDates(row, ["purchaseDate", "createdAt"])) as any);
  if (saleRows.length) await db.insert(sales).values(saleRows.map((row) => hydrateDates(row, ["saleDate", "createdAt"])) as any);
}

async function restorePurchase(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, snapshot: SnapshotRecord) {
  const purchase = hydrateDates(snapshot.purchase as SnapshotRecord, ["purchaseDate", "createdAt"]);
  const product = hydrateDates(snapshot.product as SnapshotRecord, ["createdAt", "updatedAt"]);
  if (snapshot.productDeleted) await db.insert(products).values(product as any);
  else await db.update(products).set(product as any).where(eq(products.id, Number(product.id)));
  await db.insert(purchases).values(purchase as any);
}

async function restoreSale(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, snapshot: SnapshotRecord) {
  const sale = hydrateDates(snapshot.sale as SnapshotRecord, ["saleDate", "createdAt"]);
  const product = hydrateDates(snapshot.product as SnapshotRecord, ["createdAt", "updatedAt"]);
  await db.update(products).set(product as any).where(eq(products.id, Number(product.id)));
  await db.insert(sales).values(sale as any);
}

async function restoreChyusen(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, userId: number, snapshot: SnapshotRecord) {
  const entry = snapshot.entry as SnapshotRecord;
  const entryId = Number(entry.id);
  await db.update(chyusenEntries).set({ deletedAt: null }).where(and(eq(chyusenEntries.id, entryId), eq(chyusenEntries.userId, userId)));
  await db.update(chyusenNotifications).set({ deletedAt: null }).where(and(eq(chyusenNotifications.userId, userId), eq(chyusenNotifications.entryId, entryId)));
  const sourceRows = Array.isArray(snapshot.sources) ? snapshot.sources as SnapshotRecord[] : [];
  await Promise.all(sourceRows.map((source) => db.update(chyusenSources).set({
    isActive: Number(source.isActive ?? 1),
    pausedByEntryDelete: 0,
    activeBeforeEntryDelete: null,
    nextCheckAt: Number(source.isActive ?? 1) ? new Date() : source.nextCheckAt ? new Date(source.nextCheckAt as string) : null,
  }).where(and(eq(chyusenSources.id, Number(source.id)), eq(chyusenSources.userId, userId)) )));
}

async function restoreSource(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, snapshot: SnapshotRecord) {
  const source = hydrateDates(snapshot.source as SnapshotRecord, ["lastCheckedAt", "nextCheckAt", "lastDetectedAt", "createdAt", "updatedAt"]);
  await db.insert(chyusenSources).values(source as any);
}

async function restoreNotification(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, userId: number, snapshot: SnapshotRecord) {
  const notification = snapshot.notification as SnapshotRecord;
  await db.update(chyusenNotifications).set({ deletedAt: null }).where(and(eq(chyusenNotifications.id, Number(notification.id)), eq(chyusenNotifications.userId, userId)));
}

export async function restoreTrashItem(userId: number, trashId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const item = await getTrashItem(userId, trashId);
  const snapshot = JSON.parse(item.snapshot) as SnapshotRecord;
  const type = item.entityType as TrashEntityType;

  if (type === "product") await restoreProduct(db, snapshot);
  else if (type === "purchase") await restorePurchase(db, snapshot);
  else if (type === "sale") await restoreSale(db, snapshot);
  else if (type === "chyusen") await restoreChyusen(db, userId, snapshot);
  else if (type === "source") await restoreSource(db, snapshot);
  else if (type === "notification") await restoreNotification(db, userId, snapshot);
  else throw new Error("Loại dữ liệu trong Thùng rác chưa được hỗ trợ.");

  await markTrashItemRestored(userId, trashId);
  return { id: item.id, entityType: type, title: item.title, restored: true };
}
