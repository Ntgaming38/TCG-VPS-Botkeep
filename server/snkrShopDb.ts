import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";
import { activityLogs, snkrShopItems, snkrShopPriceHistory, snkrShopSyncConfig } from "../drizzle/schema";
import { normalizeCardRank } from "../shared/cardRank";
import { getDb } from "./db";
import { fetchSnkrdunkPrice, fetchSnkrdunkProductMetadata, fetchSnkrdunkQuantityPrices, isSnkrdunkGenericImageUrl, isValidSnkrdunkUrl } from "./snkrdunk";
import { tryWhitenBuffer, whitenAndStoreImage } from "./imageWhiten";
import { processMarketplaceManualSyncBatch } from "./marketplaceManualSyncBatch";
import { storagePut } from "./storage";

export type SnkrShopProductType = "card" | "box" | "pack";
export const SNKR_SHOP_AUTO_SYNC_CRON = "0 0 * * * *";

export type SnkrShopAutoSyncSummary = { checkedCount: number; updatedCount: number; failedCount: number; skipped: boolean };
export type SnkrShopPriceMovement24h = { itemId: number; amount: number; percent: number; trend: "up" | "down" | "flat"; hasData: boolean };
export type SnkrShopSparkline7d = { itemId: number; points: Array<{ price: string | number; createdAt: Date }> };

type CreateSnkrShopItemInput = {
  name?: string;
  productType: SnkrShopProductType;
  cardRank?: string;
  sourceUrl: string;
};

type UpdateSnkrShopItemInput = Partial<CreateSnkrShopItemInput> & { imageZoom?: number; imagePositionX?: number; imagePositionY?: number };

const MAX_SNKR_PRODUCT_IMAGE_BYTES = 8 * 1024 * 1024;

function isStoredProductImage(imageUrl: string | null | undefined) {
  return Boolean(imageUrl?.startsWith("/manus-storage/"));
}

function getImageExtension(contentType: string, imageUrl: string) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  const pathname = new URL(imageUrl).pathname.toLowerCase();
  return pathname.endsWith(".png") ? "png" : pathname.endsWith(".webp") ? "webp" : "jpg";
}

/** Downloads only public SNKRDUNK images, stores bytes privately, and returns a durable app URL. */
async function persistSnkrShopProductImage(imageUrl: string | null, userId: number, itemId: number) {
  if (!imageUrl) return { imageUrl: null, error: null };
  if (isStoredProductImage(imageUrl)) return { imageUrl, error: null };

  try {
    const parsedUrl = new URL(imageUrl);
    const hostname = parsedUrl.hostname.toLowerCase();
    if (parsedUrl.protocol !== "https:" || (hostname !== "snkrdunk.com" && !hostname.endsWith(".snkrdunk.com"))) {
      throw new Error("Nguồn ảnh không thuộc SNKRDUNK.");
    }
    const response = await fetch(parsedUrl, {
      headers: { Accept: "image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8", "User-Agent": "Mozilla/5.0 (compatible; TCGManager/1.0; +https://snkrdunk.com)" },
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`Nguồn ảnh trả về HTTP ${response.status}.`);
    const contentType = response.headers.get("content-type")?.split(";")[0]?.toLowerCase() || "";
    if (!contentType.startsWith("image/")) throw new Error("Nguồn không trả về tệp hình ảnh hợp lệ.");
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > MAX_SNKR_PRODUCT_IMAGE_BYTES) throw new Error("Ảnh vượt quá giới hạn 8 MB.");
    const imageBytes = Buffer.from(await response.arrayBuffer());
    if (!imageBytes.length || imageBytes.length > MAX_SNKR_PRODUCT_IMAGE_BYTES) throw new Error("Ảnh rỗng hoặc vượt quá giới hạn 8 MB.");
    const extension = getImageExtension(contentType, parsedUrl.toString());
    const stored = await storagePut(`snkr-shop/${userId}/product-${itemId}.${extension}`, imageBytes, contentType);
    // Tự động tẩy nền đen studio thành trắng khi nhập link. Vùng tẩy phải đủ
    // lớn (>=15% ảnh) nên viền Card đen và chi tiết tối được giữ nguyên.
    // Thất bại thì giữ ảnh gốc, không chặn luồng.
    try {
      const whitened = await tryWhitenBuffer(imageBytes, 0.15);
      if (whitened) {
        const whiteStored = await storagePut(`snkr-shop/${userId}/product-${itemId}-white.png`, whitened, "image/png");
        return { imageUrl: whiteStored.url, error: null };
      }
    } catch {
      // Giữ ảnh gốc bên dưới.
    }
    return { imageUrl: stored.url, error: null };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Lỗi không xác định.";
    return { imageUrl: null, error: `Không thể lưu ảnh cố định từ SNKRDUNK: ${detail}` };
  }
}

async function getOwnedItem(itemId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [item] = await db.select().from(snkrShopItems)
    .where(and(eq(snkrShopItems.id, itemId), eq(snkrShopItems.userId, userId)))
    .limit(1);
  if (!item) throw new Error("Sản phẩm Shop SNKR không tồn tại hoặc không thuộc quyền truy cập của bạn.");
  return { db, item };
}

function validateSourceUrl(sourceUrl: string) {
  if (!isValidSnkrdunkUrl(sourceUrl)) {
    throw new Error("Link phải là trang sản phẩm https://snkrdunk.com, không phải link danh mục.");
  }
  return sourceUrl;
}

function getCardRank(productType: SnkrShopProductType, cardRank?: string | null) {
  return productType === "card" ? normalizeCardRank(cardRank) : null;
}

/** Returns watchlist data only. This never reads or mutates inventory transaction tables. */
export async function listSnkrShopItems(userId: number, search?: string) {
  const db = await getDb();
  if (!db) return [];
  const items = await db.select().from(snkrShopItems)
    .where(eq(snkrShopItems.userId, userId))
    .orderBy(desc(snkrShopItems.lastSyncedAt), desc(snkrShopItems.updatedAt), desc(snkrShopItems.id));
  const keyword = search?.trim().toLocaleLowerCase();
  return keyword ? items.filter((item) => item.name.toLocaleLowerCase().includes(keyword)) : items;
}

/** Tẩy nền đen ảnh theo dõi thành nền trắng, lưu bản mới và giữ bản gốc trong lịch sử thao tác. */
export async function whitenSnkrShopImage(itemId: number, userId: number) {
  const { db, item } = await getOwnedItem(itemId, userId);
  let imageUrl: string;
  try {
    ({ url: imageUrl } = await whitenAndStoreImage(item.imageUrl, `snkr-shop/${itemId}`));
  } catch (e: any) {
    console.error("[whitenSnkrShopImage] failed", e?.cause ?? e);
    throw new Error(e?.message || "Tẩy nền ảnh thất bại.");
  }
  await db.update(snkrShopItems).set({ imageUrl }).where(and(eq(snkrShopItems.id, itemId), eq(snkrShopItems.userId, userId)));
  return { id: itemId, name: item.name, imageUrl, message: "Đã tẩy nền đen thành nền trắng." };
}

/** Returns one private Shop SNKR item only; it remains isolated from inventory and financial tables. */
export async function getSnkrShopItem(itemId: number, userId: number) {
  const { item } = await getOwnedItem(itemId, userId);
  return item;
}

/** Returns real 24-hour price movements for pinned watchlist items only. */
export async function getPinnedSnkrShop24hChanges(userId: number): Promise<SnkrShopPriceMovement24h[]> {
  const db = await getDb();
  if (!db) return [];
  const pinnedItems = await db.select({ id: snkrShopItems.id }).from(snkrShopItems)
    .where(and(eq(snkrShopItems.userId, userId), eq(snkrShopItems.isPinned, 1)));
  if (!pinnedItems.length) return [];
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const history = await db.select({ id: snkrShopPriceHistory.id, itemId: snkrShopPriceHistory.itemId, price: snkrShopPriceHistory.price, createdAt: snkrShopPriceHistory.createdAt })
    .from(snkrShopPriceHistory)
    .where(and(inArray(snkrShopPriceHistory.itemId, pinnedItems.map((item) => item.id)), gte(snkrShopPriceHistory.createdAt, cutoff)))
    .orderBy(asc(snkrShopPriceHistory.createdAt), asc(snkrShopPriceHistory.id));
  const entriesByItem = new Map<number, typeof history>();
  history.forEach((entry) => entriesByItem.set(entry.itemId, [...(entriesByItem.get(entry.itemId) ?? []), entry]));
  return pinnedItems.map(({ id: itemId }) => {
    const entries = entriesByItem.get(itemId) ?? [];
    if (entries.length < 2) return { itemId, amount: 0, percent: 0, trend: "flat", hasData: false };
    const baseline = Number(entries[0].price) || 0;
    const latest = Number(entries[entries.length - 1].price) || 0;
    const amount = latest - baseline;
    return { itemId, amount, percent: baseline > 0 ? (amount / baseline) * 100 : 0, trend: amount > 0 ? "up" : amount < 0 ? "down" : "flat", hasData: true };
  });
}

/** Returns real seven-day price points for every account-private Shop SNKR item. */
export async function getSnkrShop7dHistory(userId: number): Promise<SnkrShopSparkline7d[]> {
  const db = await getDb();
  if (!db) return [];
  const items = await db.select({ id: snkrShopItems.id }).from(snkrShopItems)
    .where(eq(snkrShopItems.userId, userId));
  if (!items.length) return [];
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const history = await db.select({ itemId: snkrShopPriceHistory.itemId, price: snkrShopPriceHistory.price, createdAt: snkrShopPriceHistory.createdAt })
    .from(snkrShopPriceHistory)
    .where(and(inArray(snkrShopPriceHistory.itemId, items.map((item) => item.id)), gte(snkrShopPriceHistory.createdAt, cutoff)))
    .orderBy(asc(snkrShopPriceHistory.createdAt), asc(snkrShopPriceHistory.id));
  const pointsByItem = new Map<number, Array<{ price: string | number; createdAt: Date }>>();
  history.forEach((entry) => pointsByItem.set(entry.itemId, [...(pointsByItem.get(entry.itemId) ?? []), entry]));
  return items.map(({ id: itemId }) => ({ itemId, points: pointsByItem.get(itemId) ?? [] }));
}

export async function createSnkrShopItem(userId: number, input: CreateSnkrShopItemInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const sourceUrl = validateSourceUrl(input.sourceUrl.trim());
  const [existing] = await db.select({ id: snkrShopItems.id }).from(snkrShopItems)
    .where(and(eq(snkrShopItems.userId, userId), eq(snkrShopItems.sourceUrl, sourceUrl)))
    .limit(1);
  if (existing) {
    const [trackedItem] = await db.select().from(snkrShopItems)
      .where(and(eq(snkrShopItems.id, existing.id), eq(snkrShopItems.userId, userId)))
      .limit(1);
    if (!trackedItem) throw new Error("Không thể mở sản phẩm Shop SNKR đang theo dõi.");
    return { ...trackedItem, alreadyTracked: true };
  }
  const cardRank = getCardRank(input.productType, input.cardRank);
  let metadata: { title: string | null; imageUrl: string | null } = { title: null, imageUrl: null };
  try {
    metadata = await fetchSnkrdunkProductMetadata(sourceUrl);
  } catch {
    // Metadata is a convenience only; a public price sync can still be attempted after creation.
  }
  const name = input.name?.trim() || metadata.title || "Sản phẩm SNKRDUNK";
  await db.insert(snkrShopItems).values({ userId, name, productType: input.productType, cardRank, sourceUrl, sourceTitle: metadata.title, imageUrl: null }).catch((e: any) => {
    console.error("[createSnkrShopItem] insert failed", e?.cause ?? e);
    throw new Error(`Không tạo được Shop SNKR: ${e?.cause?.message || e?.message || String(e)}`);
  });
  const [item] = await db.select().from(snkrShopItems)
    .where(and(eq(snkrShopItems.userId, userId), eq(snkrShopItems.sourceUrl, sourceUrl)))
    .limit(1);
  if (!item) throw new Error("Không thể tạo sản phẩm theo dõi Shop SNKR.");
  const storedImage = await persistSnkrShopProductImage(metadata.imageUrl, userId, item.id);
  if (storedImage.imageUrl || storedImage.error) {
    await db.update(snkrShopItems).set({ imageUrl: storedImage.imageUrl, lastSyncError: storedImage.error }).where(and(eq(snkrShopItems.id, item.id), eq(snkrShopItems.userId, userId)));
  }
  await db.insert(activityLogs).values({ userId, action: "snkr_shop_item_created", description: `Thêm theo dõi Shop SNKR: ${name}`, entityType: "snkr_shop_item", entityId: item.id });
  const [created] = await db.select().from(snkrShopItems).where(and(eq(snkrShopItems.id, item.id), eq(snkrShopItems.userId, userId))).limit(1);
  return { ...(created ?? item), alreadyTracked: false };
}

export async function updateSnkrShopItem(itemId: number, userId: number, input: UpdateSnkrShopItemInput) {
  const { db, item } = await getOwnedItem(itemId, userId);
  const productType = input.productType ?? (item.productType as SnkrShopProductType);
  const nextUrl = input.sourceUrl === undefined ? item.sourceUrl : validateSourceUrl(input.sourceUrl.trim());
  const sourceChanged = nextUrl !== item.sourceUrl;
  if (sourceChanged) {
    const [duplicate] = await db.select({ id: snkrShopItems.id }).from(snkrShopItems)
      .where(and(eq(snkrShopItems.userId, userId), eq(snkrShopItems.sourceUrl, nextUrl)))
      .limit(1);
    if (duplicate) throw new Error("URL SNKRDUNK này đã có trong Shop SNKR của bạn.");
  }
  let metadata: { title: string | null; imageUrl: string | null } = sourceChanged ? { title: null, imageUrl: null } : { title: item.sourceTitle, imageUrl: item.imageUrl };
  if (sourceChanged) {
    try { metadata = await fetchSnkrdunkProductMetadata(nextUrl); } catch { /* URL vẫn được cập nhật để người dùng thử đồng bộ giá sau. */ }
  }
  const name = input.name === undefined ? (sourceChanged ? metadata.title || item.name : item.name) : input.name.trim() || metadata.title || item.name;
  const cardRank = getCardRank(productType, input.cardRank ?? item.cardRank);
  const storedImage = sourceChanged ? await persistSnkrShopProductImage(metadata.imageUrl, userId, itemId) : { imageUrl: item.imageUrl, error: null };
  await db.update(snkrShopItems).set({
    name,
    productType,
    cardRank,
    ...(input.imageZoom === undefined ? {} : { imageZoom: input.imageZoom.toFixed(2) }),
    ...(input.imagePositionX === undefined ? {} : { imagePositionX: Math.min(50, Math.max(-50, input.imagePositionX)).toFixed(2) }),
    ...(input.imagePositionY === undefined ? {} : { imagePositionY: Math.min(50, Math.max(-50, input.imagePositionY)).toFixed(2) }),
    sourceUrl: nextUrl,
    sourceTitle: sourceChanged ? metadata.title : item.sourceTitle,
    imageUrl: storedImage.imageUrl,
    currentPrice: sourceChanged ? "0" : item.currentPrice,
    lastSyncedAt: sourceChanged ? null : item.lastSyncedAt,
    lastSyncError: sourceChanged ? storedImage.error : item.lastSyncError,
  })
    .where(and(eq(snkrShopItems.id, itemId), eq(snkrShopItems.userId, userId)));
  if (sourceChanged) await db.delete(snkrShopPriceHistory).where(eq(snkrShopPriceHistory.itemId, itemId));
  const [updated] = await db.select().from(snkrShopItems).where(eq(snkrShopItems.id, itemId)).limit(1);
  return updated;
}

export async function updateSnkrShopItemImageZoom(itemId: number, userId: number, imageZoom: number, imagePositionX = 0, imagePositionY = 0) {
  const { db } = await getOwnedItem(itemId, userId);
  const positionX = Math.min(50, Math.max(-50, imagePositionX));
  const positionY = Math.min(50, Math.max(-50, imagePositionY));
  await db.update(snkrShopItems).set({ imageZoom: imageZoom.toFixed(2), imagePositionX: positionX.toFixed(2), imagePositionY: positionY.toFixed(2) }).where(and(eq(snkrShopItems.id, itemId), eq(snkrShopItems.userId, userId)));
  const [updated] = await db.select({ id: snkrShopItems.id, imageZoom: snkrShopItems.imageZoom, imagePositionX: snkrShopItems.imagePositionX, imagePositionY: snkrShopItems.imagePositionY }).from(snkrShopItems).where(and(eq(snkrShopItems.id, itemId), eq(snkrShopItems.userId, userId))).limit(1);
  return updated ?? { id: itemId, imageZoom: imageZoom.toFixed(2), imagePositionX: positionX.toFixed(2), imagePositionY: positionY.toFixed(2) };
}

export async function deleteSnkrShopItem(itemId: number, userId: number) {
  const { db, item } = await getOwnedItem(itemId, userId);
  await db.delete(snkrShopPriceHistory).where(eq(snkrShopPriceHistory.itemId, itemId));
  await db.delete(snkrShopItems).where(and(eq(snkrShopItems.id, itemId), eq(snkrShopItems.userId, userId)));
  await db.insert(activityLogs).values({ userId, action: "snkr_shop_item_deleted", description: `Xóa theo dõi Shop SNKR: ${item.name}`, entityType: "snkr_shop_item", entityId: itemId });
  return { success: true } as const;
}

/** Toggles an account-private priority pin without affecting price, inventory, or finances. */
export async function toggleSnkrShopItemPin(itemId: number, userId: number) {
  const { db, item } = await getOwnedItem(itemId, userId);
  const isPinned = item.isPinned ? 0 : 1;
  const items = isPinned ? await db.select().from(snkrShopItems).where(eq(snkrShopItems.userId, userId)) : [];
  const pinnedOrder = isPinned ? Math.max(0, ...items.filter((row) => Boolean(row.isPinned)).map((row) => row.pinnedOrder || 0)) + 1 : 0;
  await db.update(snkrShopItems).set({ isPinned, pinnedOrder }).where(and(eq(snkrShopItems.id, itemId), eq(snkrShopItems.userId, userId)));
  await db.insert(activityLogs).values({ userId, action: isPinned ? "snkr_shop_item_pinned" : "snkr_shop_item_unpinned", description: `${isPinned ? "Ghim" : "Bỏ ghim"} Shop SNKR: ${item.name}`, entityType: "snkr_shop_item", entityId: itemId });
  const [updated] = await db.select().from(snkrShopItems).where(eq(snkrShopItems.id, itemId)).limit(1);
  if (!updated) throw new Error("Không thể cập nhật trạng thái ghim sản phẩm Shop SNKR.");
  return updated;
}

/** Persists a complete user-owned ordering for the currently pinned Shop SNKR items. */
export async function reorderPinnedSnkrShopItems(userId: number, orderedIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const items = await db.select().from(snkrShopItems).where(eq(snkrShopItems.userId, userId));
  const pinnedIds = items.filter((item) => Boolean(item.isPinned)).map((item) => item.id);
  const expectedIds = new Set(pinnedIds);
  if (orderedIds.length !== pinnedIds.length || new Set(orderedIds).size !== expectedIds.size || orderedIds.some((id) => !expectedIds.has(id))) {
    throw new Error("Thứ tự sản phẩm ghim không hợp lệ.");
  }
  for (let index = 0; index < orderedIds.length; index += 1) {
    await db.update(snkrShopItems).set({ pinnedOrder: index + 1 }).where(and(eq(snkrShopItems.id, orderedIds[index]), eq(snkrShopItems.userId, userId)));
  }
  await db.insert(activityLogs).values({ userId, action: "snkr_shop_pinned_reordered", description: `Sắp xếp ${orderedIds.length} sản phẩm ghim Shop SNKR`, entityType: "snkr_shop_item", entityId: null });
  return { orderedIds };
}

export async function syncSnkrShopItem(itemId: number, userId: number, syncMode: "manual" | "auto" = "manual") {
  const { db, item } = await getOwnedItem(itemId, userId);
  const productType = item.productType as SnkrShopProductType;
  const cardRank = getCardRank(productType, item.cardRank);
  try {
    const result = await fetchSnkrdunkPrice(item.sourceUrl, productType, cardRank ?? "A");
    const syncedAt = new Date();
    let metadata: { title: string | null; imageUrl: string | null } = { title: item.sourceTitle, imageUrl: item.imageUrl };
    if (!metadata.title || !metadata.imageUrl || !isStoredProductImage(metadata.imageUrl) || isSnkrdunkGenericImageUrl(metadata.imageUrl)) {
      try { metadata = await fetchSnkrdunkProductMetadata(item.sourceUrl); } catch { /* Keep saved display metadata when the page is temporarily unavailable. */ }
    }
    const storedImage = await persistSnkrShopProductImage(metadata.imageUrl, userId, itemId);
    const nextImageUrl = storedImage.imageUrl ?? (isStoredProductImage(item.imageUrl) ? item.imageUrl : null);
    await db.update(snkrShopItems).set({ currentPrice: String(result.price), lastSyncedAt: syncedAt, lastSyncError: storedImage.error, sourceTitle: metadata.title, imageUrl: nextImageUrl })
      .where(and(eq(snkrShopItems.id, itemId), eq(snkrShopItems.userId, userId)));
    if (Number(item.currentPrice || 0) !== result.price) {
      await db.insert(snkrShopPriceHistory).values({ itemId, price: String(result.price), source: "snkrdunk" });
    }
    await db.insert(activityLogs).values({
      userId,
      action: syncMode === "auto" ? "snkr_shop_auto_price_synced" : "snkr_shop_manual_price_synced",
      description: `Cập nhật Shop SNKR: ${item.name} - ¥${result.price.toLocaleString("ja-JP")}`,
      entityType: "snkr_shop_item",
      entityId: itemId,
      newValue: JSON.stringify({ syncMode, totalCount: 1, syncedCount: 1, failedCount: 0 }),
    });
    return { itemId, name: metadata.title || item.name, currentPrice: result.price, lastSyncedAt: syncedAt, sourceUrl: item.sourceUrl };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể đồng bộ URL SNKRDUNK này.";
    await db.update(snkrShopItems).set({ lastSyncError: message }).where(and(eq(snkrShopItems.id, itemId), eq(snkrShopItems.userId, userId)));
    throw error;
  }
}

/** Updates every private Shop SNKR watch item with bounded concurrency and isolated failures. */
export async function syncAllSnkrShopItems(userId: number) {
  const items = await listSnkrShopItems(userId);
  const outcomes = await processMarketplaceManualSyncBatch(items, async (item) => {
    await syncSnkrShopItem(item.id, userId, "manual");
  }, 3);
  const failures = outcomes.flatMap((outcome) => outcome.status === "rejected" ? [{ id: outcome.item.id, name: outcome.item.name, error: outcome.error instanceof Error ? outcome.error.message : "Không thể đồng bộ." }] : []);
  const summary = { totalCount: items.length, syncedCount: outcomes.length - failures.length, failedCount: failures.length, failures };
  await (await getDb())?.insert(activityLogs).values({
    userId,
    action: "snkr_shop_manual_sync_completed",
    description: `Đồng bộ thủ công Shop SNKR: ${summary.syncedCount}/${summary.totalCount} thành công, ${summary.failedCount} lỗi`,
    entityType: "snkr_shop_sync",
    entityId: null,
    newValue: JSON.stringify({ syncMode: "manual", totalCount: summary.totalCount, syncedCount: summary.syncedCount, failedCount: summary.failedCount }),
  });
  return summary;
}

export async function getSnkrShopPriceHistory(itemId: number, userId: number, days = 30) {
  const { db } = await getOwnedItem(itemId, userId);
  const safeDays = [7, 30, 90].includes(days) ? days : 30;
  const cutoff = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);
  return db.select({ id: snkrShopPriceHistory.id, price: snkrShopPriceHistory.price, source: snkrShopPriceHistory.source, createdAt: snkrShopPriceHistory.createdAt })
    .from(snkrShopPriceHistory)
    .where(and(eq(snkrShopPriceHistory.itemId, itemId), gte(snkrShopPriceHistory.createdAt, cutoff)))
    .orderBy(asc(snkrShopPriceHistory.createdAt), asc(snkrShopPriceHistory.id))
    .limit(180);
}

/** Retrieves current public quantity choices without persisting estimated or converted prices. */
export async function getSnkrShopQuantityPrices(itemId: number, userId: number) {
  const { item } = await getOwnedItem(itemId, userId);
  return fetchSnkrdunkQuantityPrices(item.sourceUrl, item.productType as SnkrShopProductType, getCardRank(item.productType as SnkrShopProductType, item.cardRank) ?? "A");
}

export async function getSnkrShopAutoSyncConfig() {
  const db = await getDb();
  if (!db) return undefined;
  const [config] = await db.select().from(snkrShopSyncConfig).limit(1);
  return config;
}

export async function setSnkrShopAutoSyncTask(taskUid: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const config = await getSnkrShopAutoSyncConfig();
  if (config) {
    await db.update(snkrShopSyncConfig).set({ scheduleCronTaskUid: taskUid, cronExpression: SNKR_SHOP_AUTO_SYNC_CRON, isEnabled: 1 }).where(eq(snkrShopSyncConfig.id, config.id));
  } else {
    await db.insert(snkrShopSyncConfig).values({ scheduleCronTaskUid: taskUid, cronExpression: SNKR_SHOP_AUTO_SYNC_CRON, isEnabled: 1, batchSize: 12 });
  }
}

/** Runs a bounded, idempotent hourly batch. This never accesses inventory or finance tables. */
export async function runSnkrShopAutoSync(taskUid: string): Promise<SnkrShopAutoSyncSummary> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const config = await getSnkrShopAutoSyncConfig();
  if (!config?.isEnabled || !config.scheduleCronTaskUid || config.scheduleCronTaskUid !== taskUid) {
    return { checkedCount: 0, updatedCount: 0, failedCount: 0, skipped: true };
  }
  const batchSize = Math.min(Math.max(config.batchSize || 12, 1), 20);
  const items = await db.select().from(snkrShopItems).orderBy(asc(snkrShopItems.lastSyncedAt), asc(snkrShopItems.updatedAt), asc(snkrShopItems.id)).limit(batchSize);
  const outcomes = await processMarketplaceManualSyncBatch(items, async (item) => {
    await syncSnkrShopItem(item.id, item.userId, "auto");
  }, 3);
  const failedCount = outcomes.filter((outcome) => outcome.status === "rejected").length;
  const updatedCount = outcomes.length - failedCount;
  const status = failedCount === 0 ? "success" : updatedCount > 0 ? "partial" : "failed";
  await db.update(snkrShopSyncConfig).set({
    lastRunAt: new Date(),
    lastRunStatus: status,
    lastRunSummary: `Đã kiểm tra ${outcomes.length}; cập nhật ${updatedCount}; lỗi ${failedCount}.`,
  }).where(eq(snkrShopSyncConfig.id, config.id));
  const summariesByUser = new Map<number, { totalCount: number; syncedCount: number; failedCount: number }>();
  outcomes.forEach((outcome) => {
    const summary = summariesByUser.get(outcome.item.userId) ?? { totalCount: 0, syncedCount: 0, failedCount: 0 };
    summary.totalCount += 1;
    if (outcome.status === "fulfilled") summary.syncedCount += 1;
    else summary.failedCount += 1;
    summariesByUser.set(outcome.item.userId, summary);
  });
  for (const [userId, summary] of Array.from(summariesByUser.entries())) {
    await db.insert(activityLogs).values({
      userId,
      action: "snkr_shop_auto_sync_completed",
      description: `Đồng bộ tự động Shop SNKR: ${summary.syncedCount}/${summary.totalCount} thành công, ${summary.failedCount} lỗi`,
      entityType: "snkr_shop_sync",
      entityId: null,
      newValue: JSON.stringify({ syncMode: "auto", ...summary }),
    });
  }
  return { checkedCount: outcomes.length, updatedCount, failedCount, skipped: false };
}
