import { eq, and, like, sql, desc, inArray, asc, isNotNull, lt, ne, or, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, products, purchases, sales, priceHistory, shops, activityLogs, chyusenEntries, marketplaceSyncConfig } from "../drizzle/schema";
import type { InsertProduct, InsertPurchase, InsertSale, InsertShop } from "../drizzle/schema";
import { ENV } from './_core/env';
import { fetchSnkrdunkPrice, isValidSnkrdunkUrl } from './snkrdunk';
import { summarizeCardRarityQuantities } from '../shared/cardRarity';
import { formatRemainingTime, getChyusenTimeState, getChyusenUrgency } from './chyusenUtils';
import { resolveMarketplacePriceUpdate } from '../shared/marketplaceAutoSync';
import { processMarketplaceAutoSyncBatch } from './marketplaceAutoSyncBatch';
import { persistMarketplacePriceIfValid } from './marketplacePricePersistence';
import { getNearestExpiringChyusen, getNearestRegistrableChyusen, summarizeChyusenDashboard } from '../shared/chyusenDashboardStats';
import { getChyusenDaysRemaining } from '../shared/chyusenDate';
import { getMarketplace24hMovements, parseMarketplaceHistoryPeriod } from '../shared/marketplacePriceHistory';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export function serializeActivityChange(before: unknown, after: unknown) {
  return {
    oldValue: before == null ? null : JSON.stringify(before),
    newValue: after == null ? null : JSON.stringify(after),
  };
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ========== PRODUCTS ==========

export async function listProducts(userId: number, opts?: { type?: string; status?: string; search?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(products.userId, userId)];
  if (opts?.type) conditions.push(eq(products.type, opts.type as any));
  if (opts?.status) conditions.push(eq(products.status, opts.status as any));
  if (opts?.search) conditions.push(like(products.name, `%${opts.search}%`));
  return db.select().from(products).where(and(...conditions)).orderBy(desc(products.updatedAt));
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result[0];
}

export async function createProduct(data: InsertProduct) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(products).values(data);
  await db.insert(activityLogs).values({
    userId: data.userId,
    action: "product_created",
    description: `Thêm sản phẩm: ${data.name} (${data.type})`,
    entityType: "product",
    entityId: result[0].insertId,
    ...serializeActivityChange(null, data),
  });
  return { id: result[0].insertId };
}

export async function updateProduct(id: number, userId: number, data: Partial<InsertProduct>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Validation: if quantity is being updated, ensure consistency
  const product = await getProductById(id);
  if (!product || product.userId !== userId) throw new Error("Sản phẩm không tồn tại");
  if (data.quantity !== undefined) {
    const newQty = data.quantity as number;
    if (newQty < 0) throw new Error("Số lượng không thể âm");
    if (newQty < (product.damagedQuantity || 0)) {
      throw new Error("Số lượng không thể nhỏ hơn số lượng hàng hỏng");
    }
    // Auto-update status based on quantity
    if (newQty <= 0) {
      data.status = "sold" as any;
    } else if (product.status === "sold") {
      data.status = "in_stock" as any;
    }
  }
  await db.update(products).set(data).where(and(eq(products.id, id), eq(products.userId, userId)));
  // Log activity
  if (product) {
    await db.insert(activityLogs).values({
      userId,
      action: "product_updated",
      description: `Sửa sản phẩm: ${product.name}`,
      entityType: "product",
      entityId: id,
      ...serializeActivityChange(product, { ...product, ...data }),
    });
  }
}

export async function deleteProduct(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Get product info before deleting for logging
  const product = await getProductById(id);
  if (!product || product.userId !== userId) throw new Error("Sản phẩm không tồn tại");
  // Delete related sales and purchases first
  await db.delete(sales).where(and(eq(sales.productId, id), eq(sales.userId, userId)));
  await db.delete(purchases).where(and(eq(purchases.productId, id), eq(purchases.userId, userId)));
  await db.delete(products).where(and(eq(products.id, id), eq(products.userId, userId)));
  // Log activity
  await db.insert(activityLogs).values({
    userId,
    action: "product_deleted",
    description: `Xoá sản phẩm: ${product.name} (${product.type})`,
    entityType: "product",
    entityId: id,
    ...serializeActivityChange(product, null),
  });
}

export async function getProductSuggestions(userId: number, search: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: products.id,
    name: products.name,
    type: products.type,
    series: products.series,
    buyPrice: products.buyPrice,
    quantity: products.quantity,
  }).from(products).where(and(eq(products.userId, userId), like(products.name, `%${search}%`))).limit(20);
}

export async function getInStockProducts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).where(and(eq(products.userId, userId), eq(products.status, "in_stock"))).orderBy(desc(products.updatedAt));
}

export async function updateMarketPrice(id: number, userId: number, marketPrice: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Get old price
  const product = await getProductById(id);
  if (product && product.userId === userId) {
    await db.update(products).set({ marketPrice }).where(and(eq(products.id, id), eq(products.userId, userId)));
    // Save price history
    await db.insert(priceHistory).values({
      productId: id,
      oldPrice: product.marketPrice,
      newPrice: marketPrice,
      source: "manual",
    });
    await db.insert(activityLogs).values({
      userId,
      action: "market_price_updated",
      description: `Cập nhật giá thị trường: ${product.name} từ ¥${Number(product.marketPrice || 0).toLocaleString()} thành ¥${Number(marketPrice).toLocaleString()}`,
      entityType: "product",
      entityId: id,
      ...serializeActivityChange(
        { name: product.name, marketPrice: product.marketPrice },
        { name: product.name, marketPrice },
      ),
    });
  }
}

export async function getProductPriceHistory(productId: number, userId: number, days?: number) {
  const db = await getDb();
  if (!db) return [];

  const [product] = await db.select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.userId, userId)))
    .limit(1);
  if (!product) throw new Error("Sản phẩm không tồn tại hoặc không thuộc quyền truy cập của bạn.");

  const period = parseMarketplaceHistoryPeriod(days);
  const cutoff = new Date(Date.now() - period * 24 * 60 * 60 * 1000);
  return db.select({
    id: priceHistory.id,
    oldPrice: priceHistory.oldPrice,
    newPrice: priceHistory.newPrice,
    source: priceHistory.source,
    createdAt: priceHistory.createdAt,
  }).from(priceHistory)
    .where(and(eq(priceHistory.productId, productId), gte(priceHistory.createdAt, cutoff)))
    .orderBy(asc(priceHistory.createdAt), asc(priceHistory.id))
    .limit(180);
}

export async function getMarketplace24hChanges(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const userProducts = await db.select({ id: products.id }).from(products).where(and(eq(products.userId, userId), eq(products.status, "in_stock")));
  if (!userProducts.length) return [];
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const history = await db.select({
    id: priceHistory.id,
    productId: priceHistory.productId,
    oldPrice: priceHistory.oldPrice,
    newPrice: priceHistory.newPrice,
    source: priceHistory.source,
    createdAt: priceHistory.createdAt,
  }).from(priceHistory)
    .where(and(inArray(priceHistory.productId, userProducts.map((product) => product.id)), gte(priceHistory.createdAt, cutoff)))
    .orderBy(asc(priceHistory.createdAt), asc(priceHistory.id));
  return getMarketplace24hMovements(history);
}

export async function updateSnkrdunkUrl(id: number, userId: number, snkrdunkUrl: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!isValidSnkrdunkUrl(snkrdunkUrl)) {
    throw new Error("Link phải là trang sản phẩm https://snkrdunk.com, không phải link danh mục.");
  }

  const product = await getProductById(id);
  if (!product || product.userId !== userId) throw new Error("Sản phẩm không tồn tại");

  await db.update(products)
    .set({ snkrdunkUrl })
    .where(and(eq(products.id, id), eq(products.userId, userId)));
  await db.insert(activityLogs).values({
    userId,
    action: "snkrdunk_url_updated",
    description: `Gắn link SNKRDUNK cho sản phẩm: ${product.name}`,
    entityType: "product",
    entityId: id,
  });
  return { success: true, snkrdunkUrl };
}

export async function syncSnkrdunkPriceForProduct(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const product = await getProductById(id);
  if (!product || product.userId !== userId) throw new Error("Sản phẩm không tồn tại");
  if (!product.snkrdunkUrl) {
    throw new Error("Chưa có link sản phẩm SNKRDUNK. Hãy gắn link sản phẩm cụ thể trước khi đồng bộ.");
  }

  const result = await fetchSnkrdunkPrice(product.snkrdunkUrl, product.type as "card" | "box" | "pack");
  const priceDecision = resolveMarketplacePriceUpdate(product.marketPrice, result.price);
  const persisted = await persistMarketplacePriceIfValid(product.marketPrice, result.price, async (nextPrice) => {
    await db.update(products)
      .set({ marketPrice: nextPrice, snkrdunkLastSyncedAt: new Date() })
      .where(and(eq(products.id, id), eq(products.userId, userId)));
  });
  if (!persisted.updated) throw new Error("SNKRDUNK không trả về giá JPY hợp lệ. Giá cũ được giữ nguyên.");
  const newPrice = persisted.marketPrice;
  const syncedAt = new Date();

  if (Number(product.marketPrice || 0) !== result.price) {
    await db.insert(priceHistory).values({
      productId: id,
      oldPrice: product.marketPrice,
      newPrice,
      source: "snkrdunk_auto",
    });
  }

  await db.insert(activityLogs).values({
    userId,
    action: "snkrdunk_price_synced",
    description: `Đồng bộ giá SNKRDUNK: ${product.name} - ¥${result.price.toLocaleString("ja-JP")}`,
    entityType: "product",
    entityId: id,
  });

  return {
    productId: id,
    productName: product.name,
    marketPrice: result.price,
    snkrdunkLastSyncedAt: syncedAt,
    snkrdunkUrl: product.snkrdunkUrl,
  };
}

export async function syncAllSnkrdunkPrices(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const userProducts = await db.select().from(products).where(eq(products.userId, userId));
  const linkedProducts = userProducts.filter((product) => Boolean(product.snkrdunkUrl));
  const errors: Array<{ productId: number; productName: string; message: string }> = [];
  let updatedCount = 0;

  for (const product of linkedProducts) {
    try {
      await syncSnkrdunkPriceForProduct(product.id, userId);
      updatedCount += 1;
    } catch (error) {
      errors.push({
        productId: product.id,
        productName: product.name,
        message: error instanceof Error ? error.message : "Không thể đồng bộ giá.",
      });
    }
  }

  return {
    updatedCount,
    skippedCount: userProducts.length - updatedCount,
    errors,
  };
}

export type MarketplaceAutoSyncSummary = {
  checkedCount: number;
  updatedCount: number;
  failedCount: number;
  skipped: boolean;
};

const MARKETPLACE_AUTO_SYNC_CRON = "0 0 */6 * * *";
const AUTO_SYNC_DELAY_MS = 350;

export async function getMarketplaceAutoSyncConfig() {
  const db = await getDb();
  if (!db) return undefined;
  const [config] = await db.select().from(marketplaceSyncConfig).limit(1);
  return config;
}

export async function setMarketplaceAutoSyncTask(taskUid: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const config = await getMarketplaceAutoSyncConfig();
  if (config) {
    await db.update(marketplaceSyncConfig).set({ scheduleCronTaskUid: taskUid, cronExpression: MARKETPLACE_AUTO_SYNC_CRON, isEnabled: 1 }).where(eq(marketplaceSyncConfig.id, config.id));
  } else {
    await db.insert(marketplaceSyncConfig).values({ scheduleCronTaskUid: taskUid, cronExpression: MARKETPLACE_AUTO_SYNC_CRON, isEnabled: 1, batchSize: 12 });
  }
}

export async function getMarketplaceAutoSyncStatus() {
  const config = await getMarketplaceAutoSyncConfig();
  return {
    isEnabled: Boolean(config?.isEnabled && config?.scheduleCronTaskUid),
    cronExpression: config?.cronExpression || MARKETPLACE_AUTO_SYNC_CRON,
    batchSize: config?.batchSize || 12,
    lastRunAt: config?.lastRunAt || null,
    lastRunStatus: config?.lastRunStatus || null,
    lastRunSummary: config?.lastRunSummary || null,
  };
}

export async function updateMarketplaceAutoSyncSettings(input: { isEnabled?: boolean; batchSize?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const config = await getMarketplaceAutoSyncConfig();
  if (!config) throw new Error("Đồng bộ Marketplace chưa được cấu hình lịch nền.");
  const update: Record<string, unknown> = {};
  if (input.isEnabled !== undefined) update.isEnabled = input.isEnabled ? 1 : 0;
  if (input.batchSize !== undefined) update.batchSize = Math.min(Math.max(input.batchSize, 1), 20);
  if (Object.keys(update).length) {
    await db.update(marketplaceSyncConfig).set(update).where(eq(marketplaceSyncConfig.id, config.id));
  }
  return getMarketplaceAutoSyncStatus();
}

/** Scheduled batch sync. Existing prices stay unchanged if SNKRDUNK returns no valid JPY price. */
export async function runMarketplaceAutoSync(taskUid: string): Promise<MarketplaceAutoSyncSummary> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const config = await getMarketplaceAutoSyncConfig();
  if (!config?.isEnabled || !config.scheduleCronTaskUid || config.scheduleCronTaskUid !== taskUid) {
    return { checkedCount: 0, updatedCount: 0, failedCount: 0, skipped: true };
  }

  const batchSize = Math.min(Math.max(config.batchSize || 12, 1), 20);
  const linkedProducts = await db.select().from(products)
    .where(and(eq(products.status, "in_stock"), isNotNull(products.snkrdunkUrl)))
    .orderBy(asc(products.snkrdunkLastSyncedAt))
    .limit(batchSize);
  const batch = await processMarketplaceAutoSyncBatch(linkedProducts, async (product) => {
    try {
      await syncSnkrdunkPriceForProduct(product.id, product.userId);
    } catch (error) {
      console.warn("[Marketplace auto sync]", product.id, error instanceof Error ? error.message : error);
      throw error;
    }
  }, AUTO_SYNC_DELAY_MS);
  const { checkedCount, updatedCount, failedCount } = batch;
  const status = failedCount === 0 ? "success" : updatedCount > 0 ? "partial" : "failed";
  await db.update(marketplaceSyncConfig).set({
    lastRunAt: new Date(),
    lastRunStatus: status,
    lastRunSummary: `Đã kiểm tra ${checkedCount}; cập nhật ${updatedCount}; lỗi ${failedCount}.`,
  }).where(eq(marketplaceSyncConfig.id, config.id));
  return { checkedCount, updatedCount, failedCount, skipped: false };
}

// ========== DAMAGED PRODUCTS ==========

export async function markProductAsDamaged(userId: number, data: {
  productId: number; damagedQty: number; damageNote?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const product = await getProductById(data.productId);
  if (!product || product.userId !== userId) throw new Error("Product not found");
  
  const availableQty = (product.quantity || 0) - (product.damagedQuantity || 0);
  if (data.damagedQty > availableQty) throw new Error("Số lượng hỏng vượt quá số lượng còn tốt");

  const newDamagedQty = (product.damagedQuantity || 0) + data.damagedQty;
  const existingNote = product.damageNote || "";
  const newNote = data.damageNote 
    ? (existingNote ? `${existingNote}\n[${new Date().toLocaleDateString('vi-VN')}] ${data.damageNote}` : `[${new Date().toLocaleDateString('vi-VN')}] ${data.damageNote}`)
    : existingNote;

  await db.update(products).set({
    damagedQuantity: newDamagedQty,
    damageNote: newNote || null,
  }).where(and(eq(products.id, data.productId), eq(products.userId, userId)));

  await db.insert(activityLogs).values({
    userId,
    action: "product_damaged",
    description: `Đánh dấu ${data.damagedQty}x ${product.name} bị hỏng${data.damageNote ? ': ' + data.damageNote : ''}`,
    entityType: "product",
    entityId: data.productId,
    ...serializeActivityChange(
      { name: product.name, damagedQuantity: product.damagedQuantity, damageNote: product.damageNote },
      { name: product.name, damagedQuantity: newDamagedQty, damageNote: newNote || null },
    ),
  });

  return { newDamagedQty };
}

export async function getDamagedProducts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products)
    .where(and(
      eq(products.userId, userId),
      sql`${products.damagedQuantity} > 0`
    ))
    .orderBy(desc(products.updatedAt));
}

// ========== ACTIVITY LOGS ==========

export type ActivityLogFilters = {
  entityType?: "product" | "purchase" | "sale" | "shop";
  action?: string;
  syncScope?: "only" | "exclude";
  search?: string;
  limit?: number;
  cursor?: { id: number; createdAt: Date };
};

/** Returns one cursor-based activity page for the signed-in user only. */
export async function listActivityLogs(userId: number, filters?: ActivityLogFilters) {
  const db = await getDb();
  if (!db) return { items: [], nextCursor: null, totalCount: 0 };

  const baseConditions = [eq(activityLogs.userId, userId)];
  if (filters?.entityType) baseConditions.push(eq(activityLogs.entityType, filters.entityType));
  if (filters?.action) baseConditions.push(eq(activityLogs.action, filters.action));
  if (filters?.syncScope === "only") baseConditions.push(eq(activityLogs.action, "snkrdunk_price_synced"));
  if (filters?.syncScope === "exclude") baseConditions.push(ne(activityLogs.action, "snkrdunk_price_synced"));
  if (filters?.search?.trim()) baseConditions.push(like(activityLogs.description, `%${filters.search.trim()}%`));
  const conditions = [...baseConditions];
  if (filters?.cursor) {
    conditions.push(or(
      lt(activityLogs.createdAt, filters.cursor.createdAt),
      and(eq(activityLogs.createdAt, filters.cursor.createdAt), lt(activityLogs.id, filters.cursor.id)),
    )!);
  }

  const pageSize = Math.min(Math.max(filters?.limit ?? 25, 10), 100);
  const totalCount = filters?.cursor
    ? null
    : (await db.select({ totalCount: sql<number>`COUNT(*)`.mapWith(Number).as("totalCount") }).from(activityLogs).where(and(...baseConditions)))[0]?.totalCount ?? 0;
  const rows = await db.select().from(activityLogs)
    .where(and(...conditions))
    .orderBy(desc(activityLogs.createdAt), desc(activityLogs.id))
    .limit(pageSize + 1);
  const hasNextPage = rows.length > pageSize;
  const items = hasNextPage ? rows.slice(0, pageSize) : rows;
  const lastItem = items.at(-1);

  return {
    items,
    nextCursor: hasNextPage && lastItem ? { id: lastItem.id, createdAt: lastItem.createdAt } : null,
    totalCount,
  };
}

// ========== PURCHASES ==========

export async function listPurchases(userId: number, opts?: { search?: string }) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({
    id: purchases.id,
    productId: purchases.productId,
    shop: purchases.shop,
    purchaseType: purchases.purchaseType,
    quantity: purchases.quantity,
    price: purchases.price,
    totalPrice: purchases.totalPrice,
    note: purchases.note,
    status: purchases.status,
    purchaseDate: purchases.purchaseDate,
    createdAt: purchases.createdAt,
    productName: products.name,
    productType: products.type,
  }).from(purchases)
    .leftJoin(products, eq(purchases.productId, products.id))
    .where(eq(purchases.userId, userId))
    .orderBy(desc(purchases.purchaseDate));

  if (opts?.search) {
    return result.filter((r: any) => r.productName?.toLowerCase().includes(opts.search!.toLowerCase()));
  }
  return result;
}

export async function createPurchase(userId: number, data: {
  productName: string; productType: string; series?: string; shop?: string;
  purchaseType?: string; quantity: number; price: number; note?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // price is TOTAL price for the lot, unitPrice = price / quantity
  const totalPrice = data.price;
  const unitPrice = data.quantity > 0 ? data.price / data.quantity : data.price;

  // Check if product exists or create new one
  let productId: number;
  const existingProducts = await db.select().from(products)
    .where(and(eq(products.userId, userId), eq(products.name, data.productName), eq(products.type, data.productType as any)))
    .limit(1);

  if (existingProducts.length > 0) {
    productId = existingProducts[0].id;
    // Update quantity and buy price
    const currentQty = existingProducts[0].quantity || 0;
    const newQty = currentQty + data.quantity;
    // Weighted average buy price per unit
    const oldTotal = Number(existingProducts[0].buyPrice || 0) * currentQty;
    const newAvgPrice = (oldTotal + totalPrice) / newQty;
    await db.update(products).set({
      quantity: newQty,
      buyPrice: String(Math.round(newAvgPrice)),
    }).where(eq(products.id, productId));
  } else {
    const result = await db.insert(products).values({
      userId,
      name: data.productName,
      type: data.productType as any,
      series: data.series || "Pokemon",
      quantity: data.quantity,
      buyPrice: String(Math.round(unitPrice)),
      status: "in_stock",
    });
    productId = result[0].insertId;
  }

  // Create purchase record
  const purchaseResult = await db.insert(purchases).values({
    userId,
    productId,
    shop: data.shop || null,
    purchaseType: (data.purchaseType as any) || "mua_le",
    quantity: data.quantity,
    price: String(Math.round(unitPrice)),
    totalPrice: String(totalPrice),
    note: data.note || null,
    status: "received",
  });

  await db.insert(activityLogs).values({
    userId,
    action: "purchase_created",
    description: `Mua ${data.quantity}x ${data.productName} - ¥${totalPrice.toLocaleString()}`,
    entityType: "purchase",
    entityId: purchaseResult[0].insertId,
    ...serializeActivityChange(null, {
      productId,
      productName: data.productName,
      quantity: data.quantity,
      totalPrice,
      shop: data.shop || null,
      note: data.note || null,
    }),
  });

  return { productId, purchaseId: purchaseResult[0].insertId };
}

// ========== UPDATE PURCHASE ==========

export async function updatePurchase(userId: number, data: {
  purchaseId: number; quantity?: number; price?: number; shop?: string; note?: string; // price = TOTAL lot price
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get existing purchase
  const [purchase] = await db.select().from(purchases)
    .where(and(eq(purchases.id, data.purchaseId), eq(purchases.userId, userId)))
    .limit(1);
  if (!purchase) throw new Error("Giao dịch mua không tồn tại");

  // Get associated product
  const product = await getProductById(purchase.productId);
  if (!product) throw new Error("Sản phẩm không tồn tại");

  const oldQty = purchase.quantity;
  const oldTotalPrice = Number(purchase.totalPrice || 0);
  const newQty = data.quantity ?? oldQty;
  // price param is TOTAL lot price; if not provided, use existing totalPrice
  const newTotalPrice = data.price ?? oldTotalPrice;
  const newUnitPrice = newQty > 0 ? newTotalPrice / newQty : newTotalPrice;

  // Step 1: Reverse old purchase effect on product quantity
  const currentProductQty = product.quantity || 0;
  const qtyAfterReverse = currentProductQty - oldQty;

  // Step 2: Apply new purchase quantity
  const qtyAfterApply = qtyAfterReverse + newQty;

  // Step 3: Recalculate average buy price
  // Get all other purchases for this product (excluding current one)
  const otherPurchases = await db.select().from(purchases)
    .where(and(eq(purchases.productId, purchase.productId), eq(purchases.userId, userId)));
  let totalCostOther = 0;
  let totalQtyOther = 0;
  for (const p of otherPurchases) {
    if (p.id === data.purchaseId) continue;
    totalCostOther += Number(p.totalPrice || 0);
    totalQtyOther += p.quantity;
  }
  const totalCostAll = totalCostOther + newTotalPrice;
  const totalQtyAll = totalQtyOther + newQty;
  const newAvgPrice = totalQtyAll > 0 ? Math.round(totalCostAll / totalQtyAll) : 0;

  // Update product
  await db.update(products).set({
    quantity: qtyAfterApply,
    buyPrice: String(newAvgPrice),
    status: qtyAfterApply > 0 ? "in_stock" : "sold",
  }).where(eq(products.id, purchase.productId));

  // Update purchase record
  await db.update(purchases).set({
    quantity: newQty,
    price: String(Math.round(newUnitPrice)),
    totalPrice: String(newTotalPrice),
    shop: data.shop !== undefined ? (data.shop || null) : purchase.shop,
    note: data.note !== undefined ? (data.note || null) : purchase.note,
  }).where(eq(purchases.id, data.purchaseId));

  await db.insert(activityLogs).values({
    userId,
    action: "purchase_updated",
    description: `Sửa giao dịch mua #${data.purchaseId}: ${product.name}`,
    entityType: "purchase",
    entityId: data.purchaseId,
    ...serializeActivityChange(
      { productId: purchase.productId, quantity: oldQty, totalPrice: oldTotalPrice, shop: purchase.shop, note: purchase.note },
      { productId: purchase.productId, quantity: newQty, totalPrice: newTotalPrice, shop: data.shop !== undefined ? data.shop || null : purchase.shop, note: data.note !== undefined ? data.note || null : purchase.note },
    ),
  });

  return { success: true };
}

// ========== DELETE PURCHASE ==========

export async function deletePurchase(userId: number, purchaseId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get existing purchase
  const [purchase] = await db.select().from(purchases)
    .where(and(eq(purchases.id, purchaseId), eq(purchases.userId, userId)))
    .limit(1);
  if (!purchase) throw new Error("Giao dịch mua không tồn tại");

  // Check if product has any sales - if yes, cannot delete
  const productSales = await db.select().from(sales)
    .where(and(eq(sales.productId, purchase.productId), eq(sales.userId, userId)))
    .limit(1);
  if (productSales.length > 0) {
    throw new Error("Không thể xóa vì sản phẩm đã phát sinh giao dịch bán.");
  }

  // Get product
  const product = await getProductById(purchase.productId);
  if (!product) throw new Error("Sản phẩm không tồn tại");

  // Reverse quantity from product
  const newQty = (product.quantity || 0) - purchase.quantity;

  // Check if this is the only purchase for this product
  const allPurchasesForProduct = await db.select().from(purchases)
    .where(and(eq(purchases.productId, purchase.productId), eq(purchases.userId, userId)));

  if (allPurchasesForProduct.length <= 1) {
    // This is the only purchase - delete the product entirely
    await db.delete(purchases).where(eq(purchases.id, purchaseId));
    await db.delete(products).where(eq(products.id, purchase.productId));
  } else {
    // Other purchases exist - just reduce quantity and recalculate avg price
    let totalCostOther = 0;
    let totalQtyOther = 0;
    for (const p of allPurchasesForProduct) {
      if (p.id === purchaseId) continue;
      totalCostOther += Number(p.totalPrice || 0);
      totalQtyOther += p.quantity;
    }
    const newAvgPrice = totalQtyOther > 0 ? Math.round(totalCostOther / totalQtyOther) : 0;

    await db.update(products).set({
      quantity: newQty,
      buyPrice: String(newAvgPrice),
      status: newQty > 0 ? "in_stock" : "sold",
    }).where(eq(products.id, purchase.productId));

    await db.delete(purchases).where(eq(purchases.id, purchaseId));
  }

  await db.insert(activityLogs).values({
    userId,
    action: "purchase_deleted",
    description: `Xóa giao dịch mua #${purchaseId}: ${product.name}`,
    entityType: "purchase",
    entityId: purchaseId,
    ...serializeActivityChange(purchase, null),
  });

  return { success: true };
}

// ========== UPDATE SALE ==========

export async function updateSale(userId: number, data: {
  saleId: number; quantity?: number; salePrice?: number; note?: string; // salePrice = TOTAL sale price for the lot
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get existing sale
  const [sale] = await db.select().from(sales)
    .where(and(eq(sales.id, data.saleId), eq(sales.userId, userId)))
    .limit(1);
  if (!sale) throw new Error("Giao dịch bán không tồn tại");

  // Get product
  const product = await getProductById(sale.productId);
  if (!product) throw new Error("Sản phẩm không tồn tại");

  const oldQty = sale.quantity;
  const newQty = data.quantity ?? oldQty;
  // salePrice is TOTAL lot price; if not provided, use existing totalRevenue
  const newTotalSalePrice = data.salePrice ?? Number(sale.totalRevenue);





  // Step 1: Restore old quantity back to product (reverse old sale)
  const restoredQty = (product.quantity || 0) + oldQty;

  // Step 2: Check if new quantity is available
  const isDamaged = sale.note?.startsWith('[HÀNG HỎNG]') || false;
  if (isDamaged) {
    const availableDamaged = (product.damagedQuantity || 0) + oldQty;
    if (availableDamaged < newQty) throw new Error("Số lượng hàng hỏng không đủ");
  } else {
    const availableGood = restoredQty - (product.damagedQuantity || 0);
    if (availableGood < newQty) throw new Error("Số lượng hàng tốt không đủ");
  }

  // Step 3: Apply new quantity deduction
  const finalQty = restoredQty - newQty;

  // Step 4: Recalculate profit (salePrice is total for the lot)
  const totalRevenue = newTotalSalePrice;
  const newUnitSalePrice = newQty > 0 ? newTotalSalePrice / newQty : newTotalSalePrice;
  const totalCost = Number(sale.fee || 0) + Number(sale.shippingFee || 0) + Number(sale.otherCost || 0);
  const costBasis = Number(product.buyPrice) * newQty;
  const profit = totalRevenue - totalCost - costBasis;

  // Update product quantity
  if (isDamaged) {
    const newDamagedQty = (product.damagedQuantity || 0) + oldQty - newQty;
    await db.update(products).set({
      quantity: finalQty,
      damagedQuantity: newDamagedQty,
      status: finalQty <= 0 ? "sold" : "in_stock",
    }).where(eq(products.id, sale.productId));
  } else {
    await db.update(products).set({
      quantity: finalQty,
      status: finalQty <= 0 ? "sold" : "in_stock",
    }).where(eq(products.id, sale.productId));
  }

  // Update sale record
  await db.update(sales).set({
    quantity: newQty,
    salePrice: String(Math.round(newUnitSalePrice)),
    totalRevenue: String(totalRevenue),
    profit: String(profit),
    note: data.note !== undefined ? (data.note || null) : sale.note,
  }).where(eq(sales.id, data.saleId));

  await db.insert(activityLogs).values({
    userId,
    action: "sale_updated",
    description: `Sửa giao dịch bán #${data.saleId}: ${product.name} - Lợi nhuận mới: ¥${profit.toLocaleString()}`,
    entityType: "sale",
    entityId: data.saleId,
    ...serializeActivityChange(
      { productId: sale.productId, quantity: oldQty, totalRevenue: sale.totalRevenue, note: sale.note, profit: sale.profit },
      { productId: sale.productId, quantity: newQty, totalRevenue, note: data.note !== undefined ? data.note || null : sale.note, profit },
    ),
  });

  return { success: true, profit };
}

// ========== DELETE SALE ==========

export async function deleteSale(userId: number, saleId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get existing sale
  const [sale] = await db.select().from(sales)
    .where(and(eq(sales.id, saleId), eq(sales.userId, userId)))
    .limit(1);
  if (!sale) throw new Error("Giao dịch bán không tồn tại");

  // Get product
  const product = await getProductById(sale.productId);
  if (!product) throw new Error("Sản phẩm không tồn tại");

  // Restore quantity back to product
  const restoredQty = (product.quantity || 0) + sale.quantity;
  const isDamaged = sale.note?.startsWith('[HÀNG HỎNG]') || false;

  if (isDamaged) {
    const restoredDamagedQty = (product.damagedQuantity || 0) + sale.quantity;
    await db.update(products).set({
      quantity: restoredQty,
      damagedQuantity: restoredDamagedQty,
      status: "in_stock",
    }).where(eq(products.id, sale.productId));
  } else {
    await db.update(products).set({
      quantity: restoredQty,
      status: "in_stock",
    }).where(eq(products.id, sale.productId));
  }

  // Delete sale record
  await db.delete(sales).where(eq(sales.id, saleId));

  await db.insert(activityLogs).values({
    userId,
    action: "sale_deleted",
    description: `Xóa giao dịch bán #${saleId}: ${product.name} - Hoàn lại ${sale.quantity} sản phẩm`,
    entityType: "sale",
    entityId: saleId,
    ...serializeActivityChange(sale, null),
  });

  return { success: true };
}

// ========== SALES ==========

export async function listSales(userId: number, opts?: { search?: string }) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({
    id: sales.id,
    productId: sales.productId,
    quantity: sales.quantity,
    salePrice: sales.salePrice,
    totalRevenue: sales.totalRevenue,
    platform: sales.platform,
    fee: sales.fee,
    shippingFee: sales.shippingFee,
    otherCost: sales.otherCost,
    profit: sales.profit,
    note: sales.note,
    saleDate: sales.saleDate,
    createdAt: sales.createdAt,
    productName: products.name,
    productType: products.type,
  }).from(sales)
    .leftJoin(products, eq(sales.productId, products.id))
    .where(eq(sales.userId, userId))
    .orderBy(desc(sales.saleDate));

  if (opts?.search) {
    return result.filter((r: any) => r.productName?.toLowerCase().includes(opts.search!.toLowerCase()));
  }
  return result;
}

export async function createSale(userId: number, data: {
  productId: number; quantity: number; salePrice: number; isDamaged?: boolean; // salePrice = TOTAL sale price for the lot
  platform?: string; fee?: number; shippingFee?: number; otherCost?: number; note?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get product info for profit calculation
  const product = await getProductById(data.productId);
  if (!product || product.userId !== userId) throw new Error("Product not found");

  // Validate quantity based on whether selling damaged or good stock
  if (data.isDamaged) {
    const availableDamaged = product.damagedQuantity || 0;
    if (availableDamaged < data.quantity) throw new Error("Số lượng hàng hỏng không đủ");
  } else {
    const availableGood = (product.quantity || 0) - (product.damagedQuantity || 0);
    if (availableGood < data.quantity) throw new Error("Số lượng hàng tốt không đủ");
  }

  // salePrice is TOTAL sale price for the lot (not per-unit)
  const totalRevenue = data.salePrice;
  const unitSalePrice = data.quantity > 0 ? data.salePrice / data.quantity : data.salePrice;
  const totalCost = (data.fee || 0) + (data.shippingFee || 0) + (data.otherCost || 0);
  const costBasis = Number(product.buyPrice) * data.quantity;
  const profit = totalRevenue - totalCost - costBasis;

  // Create sale record
  const saleResult = await db.insert(sales).values({
    userId,
    productId: data.productId,
    quantity: data.quantity,
    salePrice: String(Math.round(unitSalePrice)),
    totalRevenue: String(totalRevenue),
    platform: (data.platform as any) || "snkrdunk",
    fee: String(data.fee || 0),
    shippingFee: String(data.shippingFee || 0),
    otherCost: String(data.otherCost || 0),
    profit: String(profit),
    note: data.isDamaged ? `[HÀNG HỎNG] ${data.note || ''}`.trim() : (data.note || null),
  });

  // Update product quantity and damagedQuantity
  const newQty = product.quantity - data.quantity;
  if (data.isDamaged) {
    const newDamagedQty = (product.damagedQuantity || 0) - data.quantity;
    await db.update(products).set({
      quantity: newQty,
      damagedQuantity: newDamagedQty,
      status: newQty <= 0 ? "sold" : "in_stock",
    }).where(eq(products.id, data.productId));
  } else {
    await db.update(products).set({
      quantity: newQty,
      status: newQty <= 0 ? "sold" : "in_stock",
    }).where(eq(products.id, data.productId));
  }

  await db.insert(activityLogs).values({
    userId,
    action: "sale_created",
    description: `Bán ${data.quantity}x ${product.name}${data.isDamaged ? ' (hàng hỏng)' : ''} - Lợi nhuận: ¥${profit.toLocaleString()}`,
    entityType: "sale",
    entityId: saleResult[0].insertId,
    ...serializeActivityChange(null, {
      productId: data.productId,
      productName: product.name,
      quantity: data.quantity,
      totalRevenue,
      profit,
      platform: data.platform || "snkrdunk",
      note: data.note || null,
    }),
  });

  return { profit };
}

// ========== DASHBOARD ==========

export async function getDashboardStats(userId: number) {
  const db = await getDb();
  if (!db) return {
    totalCapital: 0, currentValue: 0, totalProfit: 0,
    totalInStock: 0, inStockCards: 0, inStockBoxes: 0, inStockPacks: 0,
    totalSold: 0, soldCards: 0, soldBoxes: 0, soldPacks: 0,
    cardRarityStats: [], chartData: [], recentActivities: [],
    chyusen: { open: 0, expiring: 0, deadlineToday: false, deadlineTomorrow: false, waitingResult: 0, won: 0, lost: 0 }, chyusenReminders: [], chyusenNearestDeadline: null, chyusenRegisterNow: null,
  };

  // Get all user products
  const userProducts = await db.select().from(products).where(eq(products.userId, userId));

  // In-stock products (quantity > 0 and status is in_stock)
  const inStockProducts = userProducts.filter(p => p.status === "in_stock" && (p.quantity || 0) > 0);
  const totalInStock = inStockProducts.reduce((sum, p) => sum + (p.quantity || 0), 0);
  const inStockCards = inStockProducts.filter(p => p.type === "card").reduce((sum, p) => sum + (p.quantity || 0), 0);
  const inStockBoxes = inStockProducts.filter(p => p.type === "box").reduce((sum, p) => sum + (p.quantity || 0), 0);
  const inStockPacks = inStockProducts.filter(p => p.type === "pack").reduce((sum, p) => sum + (p.quantity || 0), 0);
  const cardRarityStats = summarizeCardRarityQuantities(inStockProducts.filter(p => p.type === "card"));
  const userChyusenEntries = await db.select().from(chyusenEntries).where(eq(chyusenEntries.userId, userId));
  const chyusenWithState = userChyusenEntries.map((entry) => ({
    ...entry,
    timeState: getChyusenTimeState(entry),
    urgency: getChyusenUrgency(entry.applicationEnd),
    daysRemaining: getChyusenDaysRemaining(entry.applicationEnd),
    remainingTime: formatRemainingTime(entry.applicationEnd),
  }));
  const chyusen = { open: 0, ...summarizeChyusenDashboard(chyusenWithState) };
  const nearestExpiringChyusen = getNearestExpiringChyusen(chyusenWithState);
  const chyusenNearestDeadline = nearestExpiringChyusen ? {
    id: nearestExpiringChyusen.id,
    title: nearestExpiringChyusen.title,
    shop: nearestExpiringChyusen.shop,
    daysRemaining: nearestExpiringChyusen.daysRemaining,
  } : null;
  const nearestRegistrableChyusen = getNearestRegistrableChyusen(chyusenWithState);
  const chyusenRegisterNow = nearestRegistrableChyusen ? {
    id: nearestRegistrableChyusen.id,
    title: nearestRegistrableChyusen.title,
    sourceUrl: nearestRegistrableChyusen.sourceUrl,
    daysRemaining: nearestRegistrableChyusen.daysRemaining,
  } : null;
  const chyusenReminders = chyusenWithState
    .filter((entry) => entry.urgency && entry.applicationStatus === "not_registered")
    .sort((a, b) => (a.applicationEnd?.getTime() || 0) - (b.applicationEnd?.getTime() || 0))
    .slice(0, 3);

  // Sold products
  // Sold quantity: count from actual sales records (sum of quantities sold)
  const userSalesForCount = await db.select().from(sales).where(eq(sales.userId, userId));
  const totalSold = userSalesForCount.reduce((sum, s) => sum + s.quantity, 0);
  const productMap = new Map(userProducts.map(p => [p.id, p]));
  let soldCards = 0, soldBoxes = 0, soldPacks = 0;
  for (const s of userSalesForCount) {
    const prod = productMap.get(s.productId);
    if (prod) {
      if (prod.type === "card") soldCards += s.quantity;
      else if (prod.type === "box") soldBoxes += s.quantity;
      else if (prod.type === "pack") soldPacks += s.quantity;
    }
  }

  // Calculate totals
  let totalCapital = 0;
  let currentValue = 0;
  inStockProducts.forEach(p => {
    totalCapital += Number(p.buyPrice || 0) * (p.quantity || 0);
    currentValue += Number(p.marketPrice || p.buyPrice || 0) * (p.quantity || 0);
  });

  // Get total profit from sales
  const totalProfit = userSalesForCount.reduce((sum, s) => sum + Number(s.profit || 0), 0);

  // Chart data - last 6 months
  const chartData: { month: string; revenue: number; profit: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = `T${d.getMonth() + 1}/${d.getFullYear()}`;
    const monthSales = userSalesForCount.filter(s => {
      const sd = new Date(s.saleDate);
      return sd.getFullYear() === d.getFullYear() && sd.getMonth() === d.getMonth();
    });
    const revenue = monthSales.reduce((sum, s) => sum + Number(s.totalRevenue || 0), 0);
    const profit = monthSales.reduce((sum, s) => sum + Number(s.profit || 0), 0);
    chartData.push({ month: monthLabel, revenue, profit });
  }

  // Recent activities
  const recentActivities = await db.select().from(activityLogs)
    .where(eq(activityLogs.userId, userId))
    .orderBy(desc(activityLogs.createdAt))
    .limit(10);

  return {
    totalCapital, currentValue, totalProfit,
    totalInStock, inStockCards, inStockBoxes, inStockPacks,
    totalSold, soldCards, soldBoxes, soldPacks,
    cardRarityStats, chartData, recentActivities, chyusen, chyusenReminders, chyusenNearestDeadline, chyusenRegisterNow,
  };
}

// ========== REPORTS ==========

export async function getReportsOverview(userId: number) {
  const db = await getDb();
  if (!db) return { totalBought: 0, totalSold: 0, totalProfit: 0, roi: 0, monthlyData: [], topProducts: [] };

  const userPurchases = await db.select().from(purchases).where(eq(purchases.userId, userId));
  const userSales = await db.select().from(sales).where(eq(sales.userId, userId));

  const totalBought = userPurchases.reduce((sum, p) => sum + Number(p.totalPrice || 0), 0);
  const totalSold = userSales.reduce((sum, s) => sum + Number(s.totalRevenue || 0), 0);
  const totalProfit = userSales.reduce((sum, s) => sum + Number(s.profit || 0), 0);
  const roi = totalBought > 0 ? (totalProfit / totalBought) * 100 : 0;

  // Monthly profit data - last 12 months
  const monthlyData: { month: string; profit: number }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthLabel = `T${d.getMonth() + 1}/${d.getFullYear()}`;
    const monthSales = userSales.filter(s => {
      const sd = new Date(s.saleDate);
      return sd.getFullYear() === d.getFullYear() && sd.getMonth() === d.getMonth();
    });
    const profit = monthSales.reduce((sum, s) => sum + Number(s.profit || 0), 0);
    monthlyData.push({ month: monthLabel, profit });
  }

  // Top products by profit
  const productProfitMap = new Map<number, { name: string; type: string; profit: number }>();
  for (const s of userSales) {
    const existing = productProfitMap.get(s.productId);
    if (existing) {
      existing.profit += Number(s.profit || 0);
    } else {
      productProfitMap.set(s.productId, { name: '', type: '', profit: Number(s.profit || 0) });
    }
  }

  // Get product names
  const productIds = Array.from(productProfitMap.keys());
  if (productIds.length > 0) {
    const productList = await db.select({ id: products.id, name: products.name, type: products.type })
      .from(products).where(inArray(products.id, productIds));
    for (const p of productList) {
      const entry = productProfitMap.get(p.id);
      if (entry) { entry.name = p.name; entry.type = p.type; }
    }
  }

  const topProducts = Array.from(productProfitMap.values())
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 10);

  return { totalBought, totalSold, totalProfit, roi, monthlyData, topProducts };
}

// ========== SHOPS ==========

export async function listShops(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(shops).where(eq(shops.userId, userId));
}

export async function createShop(data: InsertShop) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(shops).values(data);
  await db.insert(activityLogs).values({
    userId: data.userId,
    action: "shop_created",
    description: `Thêm cửa hàng: ${data.name}`,
    entityType: "shop",
    entityId: result[0].insertId,
    ...serializeActivityChange(null, data),
  });
  return { id: result[0].insertId };
}
