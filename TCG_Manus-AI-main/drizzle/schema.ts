import { bigint, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  language: varchar("language", { length: 10 }).default("vi"),
  currency: varchar("currency", { length: 10 }).default("JPY"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Products - central table for all items (Card, Box, Pack)
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  series: varchar("series", { length: 100 }).default("Pokemon"),
  setName: varchar("setName", { length: 255 }),
  type: mysqlEnum("type", ["card", "box", "pack"]).notNull(),
  image: text("image"),
  description: text("description"),
  // Card-specific fields
  cardNumber: varchar("cardNumber", { length: 50 }),
  language: varchar("language", { length: 20 }).default("Japanese"),
  rarity: varchar("rarity", { length: 50 }),
  condition: varchar("condition", { length: 50 }).default("New"),
  psaGrade: varchar("psaGrade", { length: 20 }),
  // Box-specific fields
  releaseDate: varchar("releaseDate", { length: 20 }),
  // Common fields
  quantity: int("quantity").default(0).notNull(),
  damagedQuantity: int("damagedQuantity").default(0).notNull(),
  damageNote: text("damageNote"),
  buyPrice: decimal("buyPrice", { precision: 12, scale: 2 }).default("0"),
  marketPrice: decimal("marketPrice", { precision: 12, scale: 2 }).default("0"),
  snkrdunkUrl: text("snkrdunkUrl"),
  snkrdunkLastSyncedAt: timestamp("snkrdunkLastSyncedAt"),
  sellPrice: decimal("sellPrice", { precision: 12, scale: 2 }).default("0"),
  status: mysqlEnum("status", ["in_stock", "sold", "reserved", "traded", "damaged"]).default("in_stock").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/** Project-level automatic SNKRDUNK price synchronization configuration. */
export const marketplaceSyncConfig = mysqlTable("marketplace_sync_config", {
  id: int("id").autoincrement().primaryKey(),
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }).unique(),
  cronExpression: varchar("cronExpression", { length: 100 }).notNull().default("0 0 */6 * * *"),
  isEnabled: int("isEnabled").notNull().default(1),
  batchSize: int("batchSize").notNull().default(12),
  lastRunAt: timestamp("lastRunAt"),
  lastRunStatus: varchar("lastRunStatus", { length: 30 }),
  lastRunSummary: varchar("lastRunSummary", { length: 1000 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Purchases - buy transaction history
 */
export const purchases = mysqlTable("purchases", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productId: int("productId").notNull(),
  shop: varchar("shop", { length: 255 }),
  purchaseType: mysqlEnum("purchaseType", ["mua_le", "coc_5", "coc_10", "coc_30"]).default("mua_le"),
  quantity: int("quantity").notNull().default(1),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  totalPrice: decimal("totalPrice", { precision: 12, scale: 2 }).notNull(),
  note: text("note"),
  image: text("image"),
  status: mysqlEnum("status", ["paid", "received", "pending", "cancelled"]).default("received"),
  purchaseDate: timestamp("purchaseDate").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = typeof purchases.$inferInsert;

/**
 * Sales - sell transaction history
 */
export const sales = mysqlTable("sales", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productId: int("productId").notNull(),
  quantity: int("quantity").notNull().default(1),
  salePrice: decimal("salePrice", { precision: 12, scale: 2 }).notNull(),
  totalRevenue: decimal("totalRevenue", { precision: 12, scale: 2 }).notNull(),
  platform: mysqlEnum("platform", ["snkrdunk", "mercari", "yahoo", "shop", "offline", "other"]).default("snkrdunk"),
  fee: decimal("fee", { precision: 12, scale: 2 }).default("0"),
  shippingFee: decimal("shippingFee", { precision: 12, scale: 2 }).default("0"),
  otherCost: decimal("otherCost", { precision: 12, scale: 2 }).default("0"),
  profit: decimal("profit", { precision: 12, scale: 2 }).default("0"),
  note: text("note"),
  image: text("image"),
  saleDate: timestamp("saleDate").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Sale = typeof sales.$inferSelect;
export type InsertSale = typeof sales.$inferInsert;

/**
 * Price History - track price changes over time
 */
export const priceHistory = mysqlTable("price_history", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  oldPrice: decimal("oldPrice", { precision: 12, scale: 2 }),
  newPrice: decimal("newPrice", { precision: 12, scale: 2 }).notNull(),
  source: varchar("source", { length: 100 }).default("manual"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("price_history_product_created_idx").on(table.productId, table.createdAt, table.id),
]);

export type PriceHistory = typeof priceHistory.$inferSelect;

/**
 * Shops - store/shop list for purchases
 */
export const shops = mysqlTable("shops", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Shop = typeof shops.$inferSelect;
export type InsertShop = typeof shops.$inferInsert;

/**
 * Activity Logs - track all user actions
 */
export const activityLogs = mysqlTable("activity_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  description: text("description"),
  entityType: varchar("entityType", { length: 50 }),
  entityId: int("entityId"),
  oldValue: text("oldValue"),
  newValue: text("newValue"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("activity_logs_user_created_idx").on(table.userId, table.createdAt, table.id),
]);

export type ActivityLog = typeof activityLogs.$inferSelect;

/**
 * Chyusen entries are always private to one user. Source information is retained
 * separately so a later public-page refresh never overwrites the saved entry
 * without the user's confirmation.
 */
export const chyusenEntries = mysqlTable("chyusen_entries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  productName: varchar("productName", { length: 255 }).notNull(),
  series: varchar("series", { length: 100 }).default("Pokemon"),
  productType: mysqlEnum("productType", ["card", "box", "pack", "set", "other"]).default("other").notNull(),
  shop: varchar("shop", { length: 100 }).default("Khác"),
  customShopName: varchar("customShopName", { length: 255 }),
  sourceUrl: text("sourceUrl"),
  externalProductId: varchar("externalProductId", { length: 255 }),
  imageUrl: text("imageUrl"),
  price: decimal("price", { precision: 12, scale: 2 }),
  quantityLimit: varchar("quantityLimit", { length: 100 }),
  applicationStart: timestamp("applicationStart"),
  applicationEnd: timestamp("applicationEnd"),
  resultDate: timestamp("resultDate"),
  pickupStart: timestamp("pickupStart"),
  pickupEnd: timestamp("pickupEnd"),
  pickupNote: varchar("pickupNote", { length: 500 }),
  requirements: text("requirements"),
  applicationStatus: mysqlEnum("applicationStatus", ["not_registered", "registered", "cancelled", "won", "lost", "not_participating"]).default("not_registered").notNull(),
  resultStatus: mysqlEnum("resultStatus", ["pending", "won", "lost", "unknown"]).default("pending").notNull(),
  sourceTimezone: varchar("sourceTimezone", { length: 64 }).default("Asia/Tokyo").notNull(),
  parserStatus: mysqlEnum("parserStatus", ["manual", "partial", "detected", "unavailable"]).default("manual").notNull(),
  parserNote: text("parserNote"),
  fieldConfidence: text("fieldConfidence"),
  sourceContentHash: varchar("sourceContentHash", { length: 64 }),
  lastCheckedAt: timestamp("lastCheckedAt"),
  purchaseCreatedAt: timestamp("purchaseCreatedAt"),
  deletedAt: timestamp("deletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("chyusen_entries_user_idx").on(table.userId),
  index("chyusen_entries_user_deleted_idx").on(table.userId, table.deletedAt),
  index("chyusen_entries_deadline_idx").on(table.applicationEnd),
  index("chyusen_entries_user_external_product_idx").on(table.userId, table.externalProductId),
]);

export type ChyusenEntry = typeof chyusenEntries.$inferSelect;
export type InsertChyusenEntry = typeof chyusenEntries.$inferInsert;

/** Public sources can be refreshed automatically, but are private to their owner. */
export const chyusenSources = mysqlTable("chyusen_sources", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  entryId: int("entryId"),
  sourceUrl: varchar("sourceUrl", { length: 2048 }).notNull(),
  label: varchar("label", { length: 255 }),
  isActive: int("isActive").default(1).notNull(),
  pausedByEntryDelete: int("pausedByEntryDelete").default(0).notNull(),
  activeBeforeEntryDelete: int("activeBeforeEntryDelete"),
  latestStatus: mysqlEnum("latestStatus", ["monitoring", "detected", "unavailable"]).default("monitoring").notNull(),
  latestError: text("latestError"),
  contentHash: varchar("contentHash", { length: 64 }),
  checkIntervalMinutes: int("checkIntervalMinutes").default(360).notNull(),
  lastCheckedAt: timestamp("lastCheckedAt"),
  nextCheckAt: timestamp("nextCheckAt"),
  failureCount: int("failureCount").default(0).notNull(),
  detectedCount: int("detectedCount").default(0).notNull(),
  lastDetectedAt: timestamp("lastDetectedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("chyusen_sources_user_url_unique").on(table.userId, table.sourceUrl),
  index("chyusen_sources_active_idx").on(table.isActive),
]);

export type ChyusenSource = typeof chyusenSources.$inferSelect;

/** Immutable audit rows for public-source changes, retained independently from user-approved entry edits. */
export const chyusenSourceHistory = mysqlTable("chyusen_source_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sourceId: int("sourceId").notNull(),
  entryId: int("entryId"),
  previousHash: varchar("previousHash", { length: 64 }),
  currentHash: varchar("currentHash", { length: 64 }).notNull(),
  changeType: mysqlEnum("changeType", ["content_changed", "first_seen", "unavailable"]).default("content_changed").notNull(),
  summary: text("summary"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("chyusen_source_history_source_hash_unique").on(table.sourceId, table.currentHash),
  index("chyusen_source_history_source_idx").on(table.sourceId),
  index("chyusen_source_history_user_idx").on(table.userId),
]);

export type ChyusenSourceHistory = typeof chyusenSourceHistory.$inferSelect;

/** Keeps a user-visible audit record of fields approved after a source refresh. */
export const chyusenHistory = mysqlTable("chyusen_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  entryId: int("entryId").notNull(),
  fieldName: varchar("fieldName", { length: 100 }).notNull(),
  oldValue: text("oldValue"),
  newValue: text("newValue"),
  changeSource: mysqlEnum("changeSource", ["manual", "source_refresh", "source_import"]).default("manual").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("chyusen_history_entry_idx").on(table.entryId),
  index("chyusen_history_user_idx").on(table.userId),
]);

export type ChyusenHistoryRecord = typeof chyusenHistory.$inferSelect;

/** In-app notices are idempotent through notificationKey and scoped to one user. */
export const chyusenNotifications = mysqlTable("chyusen_notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  entryId: int("entryId"),
  sourceId: int("sourceId"),
  type: varchar("type", { length: 64 }).notNull(),
  notificationKey: varchar("notificationKey", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  category: varchar("category", { length: 32 }).default("chyusen").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  link: varchar("link", { length: 2048 }),
  isRead: int("isRead").default(0).notNull(),
  readAt: timestamp("readAt"),
  deletedAt: timestamp("deletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("chyusen_notifications_user_key_unique").on(table.userId, table.notificationKey),
  index("chyusen_notifications_user_read_idx").on(table.userId, table.isRead),
  index("chyusen_notifications_user_category_idx").on(table.userId, table.category),
]);

export type ChyusenNotification = typeof chyusenNotifications.$inferSelect;

/** Per-user preferences for in-app Chyusen notifications. Push delivery remains opt-in. */
export const chyusenNotificationSettings = mysqlTable("chyusen_notification_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  lotteryNew: int("lotteryNew").default(1).notNull(),
  lotteryExpiring: int("lotteryExpiring").default(1).notNull(),
  lotteryResult: int("lotteryResult").default(1).notNull(),
  lotteryChanged: int("lotteryChanged").default(1).notNull(),
  lotteryWon: int("lotteryWon").default(1).notNull(),
  lotteryLost: int("lotteryLost").default(1).notNull(),
  deadlineHoursJson: text("deadlineHoursJson").notNull(),
  pushEnabled: int("pushEnabled").default(0).notNull(),
  quietHoursEnabled: int("quietHoursEnabled").default(0).notNull(),
  quietStart: varchar("quietStart", { length: 5 }).default("22:00"),
  quietEnd: varchar("quietEnd", { length: 5 }).default("08:00"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("chyusen_notification_settings_user_unique").on(table.userId),
]);

export type ChyusenNotificationSettings = typeof chyusenNotificationSettings.$inferSelect;

/** Stores the task UID for the project-level hourly source monitor. */
export const chyusenMonitorConfig = mysqlTable("chyusen_monitor_config", {
  id: int("id").autoincrement().primaryKey(),
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
  cronExpression: varchar("cronExpression", { length: 64 }).default("0 0 * * * *"),
  isEnabled: int("isEnabled").default(1).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
