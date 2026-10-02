import { and, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import {
  chyusenEntries,
  chyusenHistory,
  activityLogs,
  chyusenMonitorConfig,
  chyusenNotifications,
  chyusenNotificationSettings,
  chyusenSources,
  chyusenSourceHistory,
  chyusenShopSuggestions,
} from "../drizzle/schema";
import { getDb, serializeActivityChange } from "./db";
import { getChyusenTimeState, getChyusenUrgency } from "./chyusenUtils";
import { createTrashItem, markLatestTrashItemRestored } from "./trashDb";

export type ChyusenEntryInput = {
  title: string;
  productName: string;
  series?: string;
  productType?: "card" | "box" | "pack" | "set" | "other";
  shop?: string;
  customShopName?: string;
  sourceUrl?: string;
  externalProductId?: string;
  imageUrl?: string;
  price?: number | null;
  quantityLimit?: string;
  applicationStart?: Date | null;
  applicationEnd?: Date | null;
  resultDate?: Date | null;
  resultCheckedAt?: Date | null;
  pickupStart?: Date | null;
  pickupEnd?: Date | null;
  pickupNote?: string;
  requirements?: string;
  applicationStatus?: "not_registered" | "registered" | "cancelled" | "won" | "lost" | "not_participating";
  resultStatus?: "pending" | "won" | "lost" | "unknown";
  sourceTimezone?: string;
  parserStatus?: "manual" | "partial" | "detected" | "unavailable";
  parserNote?: string;
  fieldConfidence?: Record<string, string>;
  sourceContentHash?: string;
};

export const CHYUSEN_INTERVAL_MINUTES = [60, 180, 360, 720, 1440] as const;
export const DEFAULT_CHYUSEN_DEADLINE_HOURS = [168, 72, 24, 12, 3, 1];
export const CHYUSEN_UNDO_WINDOW_MS = 10_000;

async function listChyusenShopSuggestionDetails(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(chyusenShopSuggestions).where(eq(chyusenShopSuggestions.userId, userId));
  const entries = await db.select({ shop: chyusenEntries.shop, customShopName: chyusenEntries.customShopName, createdAt: chyusenEntries.createdAt }).from(chyusenEntries).where(and(eq(chyusenEntries.userId, userId), isNull(chyusenEntries.deletedAt)));
  const usageByName = new Map<string, number>();
  for (const entry of entries) {
    const effectiveName = (entry.customShopName || entry.shop || "").trim().toLocaleLowerCase();
    if (effectiveName) usageByName.set(effectiveName, (usageByName.get(effectiveName) || 0) + 1);
  }
  return rows
    .map((row) => ({ ...row, useCount: usageByName.get(row.name.trim().toLocaleLowerCase()) || 0 }))
    .sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || (a.isPinned ? a.pinnedOrder - b.pinnedOrder || b.useCount - a.useCount : b.useCount - a.useCount) || a.name.localeCompare(b.name, "vi"));
}

export async function listChyusenShopSuggestions(userId: number) {
  return (await listChyusenShopSuggestionDetails(userId)).map((row) => row.name);
}

export async function listChyusenShopSuggestionsForManagement(userId: number) {
  return listChyusenShopSuggestionDetails(userId);
}

export async function listRecentChyusenShops(userId: number, limit = 5) {
  const db = await getDb();
  if (!db) return [];
  const entries = await db.select({ shop: chyusenEntries.shop, customShopName: chyusenEntries.customShopName, createdAt: chyusenEntries.createdAt }).from(chyusenEntries).where(and(eq(chyusenEntries.userId, userId), isNull(chyusenEntries.deletedAt)));
  const names = new Map<string, { name: string; usedAt: Date }>();
  for (const entry of entries) {
    const name = (entry.customShopName || entry.shop || "").trim();
    if (!name) continue;
    const key = name.toLocaleLowerCase();
    const usedAt = entry.createdAt;
    const current = names.get(key);
    if (!current || usedAt > current.usedAt) names.set(key, { name, usedAt });
  }
  return Array.from(names.values()).sort((a, b) => b.usedAt.getTime() - a.usedAt.getTime() || a.name.localeCompare(b.name, "vi")).slice(0, limit);
}

export async function saveChyusenShopSuggestion(userId: number, rawName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const name = rawName.trim().replace(/\s+/g, " ");
  if (!name) throw new Error("Vui lòng nhập tên cửa hàng.");
  const existing = await db.select().from(chyusenShopSuggestions).where(eq(chyusenShopSuggestions.userId, userId));
  const matched = existing.find((row) => row.name.localeCompare(name, undefined, { sensitivity: "accent" }) === 0);
  if (matched) return { id: matched.id, name: matched.name, created: false };
  const result = await db.insert(chyusenShopSuggestions).values({ userId, name });
  await db.insert(activityLogs).values({ userId, action: "chyusen_shop_suggestion_created", description: `Thêm cửa hàng gợi ý Chyusen: ${name}`, entityType: "chyusen_shop", entityId: result[0].insertId, ...serializeActivityChange(null, { name }) });
  return { id: result[0].insertId, name, created: true };
}

export async function updateChyusenShopSuggestion(userId: number, id: number, rawName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const name = rawName.trim().replace(/\s+/g, " ");
  if (!name) throw new Error("Vui lòng nhập tên cửa hàng.");
  const rows = await db.select().from(chyusenShopSuggestions).where(eq(chyusenShopSuggestions.userId, userId));
  const existing = rows.find((row) => row.id === id);
  if (!existing) throw new Error("Không tìm thấy cửa hàng gợi ý.");
  const duplicate = rows.find((row) => row.id !== id && row.name.localeCompare(name, undefined, { sensitivity: "accent" }) === 0);
  if (duplicate) throw new Error("Tên cửa hàng này đã có trong gợi ý.");
  await db.update(chyusenShopSuggestions).set({ name }).where(and(eq(chyusenShopSuggestions.id, id), eq(chyusenShopSuggestions.userId, userId)));
  await db.insert(activityLogs).values({ userId, action: "chyusen_shop_suggestion_updated", description: `Sửa cửa hàng gợi ý Chyusen: ${existing.name} → ${name}`, entityType: "chyusen_shop", entityId: id, ...serializeActivityChange({ name: existing.name }, { name }) });
  return { id, name };
}

export async function deleteChyusenShopSuggestion(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(chyusenShopSuggestions).where(eq(chyusenShopSuggestions.userId, userId));
  const existing = rows.find((row) => row.id === id);
  if (!existing) throw new Error("Không tìm thấy cửa hàng gợi ý.");
  await db.delete(chyusenShopSuggestions).where(and(eq(chyusenShopSuggestions.id, id), eq(chyusenShopSuggestions.userId, userId)));
  await db.insert(activityLogs).values({ userId, action: "chyusen_shop_suggestion_deleted", description: `Xóa cửa hàng gợi ý Chyusen: ${existing.name}`, entityType: "chyusen_shop", entityId: id, ...serializeActivityChange({ name: existing.name }, null) });
}

export async function setChyusenShopSuggestionPinned(userId: number, id: number, isPinned: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(chyusenShopSuggestions).where(eq(chyusenShopSuggestions.userId, userId));
  const existing = rows.find((row) => row.id === id);
  if (!existing) throw new Error("Không tìm thấy cửa hàng gợi ý.");
  const pinnedOrder = isPinned ? Math.max(0, ...rows.filter((row) => Boolean(row.isPinned)).map((row) => row.pinnedOrder || 0)) + 1 : 0;
  await db.update(chyusenShopSuggestions).set({ isPinned: isPinned ? 1 : 0, pinnedOrder }).where(and(eq(chyusenShopSuggestions.id, id), eq(chyusenShopSuggestions.userId, userId)));
  await db.insert(activityLogs).values({ userId, action: "chyusen_shop_suggestion_pinned", description: `${isPinned ? "Ghim" : "Bỏ ghim"} cửa hàng gợi ý Chyusen: ${existing.name}`, entityType: "chyusen_shop", entityId: id, ...serializeActivityChange({ isPinned: Boolean(existing.isPinned) }, { isPinned }) });
  return { id, isPinned };
}

export async function reorderPinnedChyusenShopSuggestions(userId: number, orderedIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(chyusenShopSuggestions).where(eq(chyusenShopSuggestions.userId, userId));
  const pinned = rows.filter((row) => Boolean(row.isPinned));
  const pinnedIds = new Set(pinned.map((row) => row.id));
  if (orderedIds.length !== pinnedIds.size || new Set(orderedIds).size !== orderedIds.length || orderedIds.some((id) => !pinnedIds.has(id))) {
    throw new Error("Thứ tự cửa hàng ghim không hợp lệ.");
  }
  for (let index = 0; index < orderedIds.length; index += 1) {
    const id = orderedIds[index];
    await db.update(chyusenShopSuggestions).set({ pinnedOrder: index + 1 }).where(and(eq(chyusenShopSuggestions.id, id), eq(chyusenShopSuggestions.userId, userId)));
  }
  await db.insert(activityLogs).values({ userId, action: "chyusen_shop_suggestions_reordered", description: `Sắp xếp lại ${orderedIds.length} cửa hàng gợi ý Chyusen đã ghim`, entityType: "chyusen_shop", ...serializeActivityChange(null, { orderedIds }) });
  return { orderedIds };
}

export type ChyusenSourceInput = {
  sourceUrl: string;
  label?: string | null;
  checkIntervalMinutes?: number;
  isActive?: boolean;
};

const editableFields = [
  "title", "productName", "series", "productType", "shop", "customShopName", "sourceUrl", "externalProductId", "imageUrl", "price",
  "quantityLimit", "applicationStart", "applicationEnd", "resultDate", "pickupStart", "pickupEnd", "pickupNote", "requirements",
  "applicationStatus", "resultStatus", "resultCheckedAt", "sourceTimezone", "parserStatus", "parserNote", "fieldConfidence", "sourceContentHash",
] as const;

const serialize = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" ? value : JSON.stringify(value);
};

const normalizeDuplicateText = (value: string | null | undefined) => (value || "").trim().toLocaleLowerCase();
const toDateKey = (value: Date | null | undefined) => value ? value.toISOString() : "";

type ChyusenActivityEntry = {
  title?: string | null;
  productName?: string | null;
  series?: string | null;
  shop?: string | null;
  customShopName?: string | null;
  applicationStatus?: ChyusenEntryInput["applicationStatus"] | null;
  resultStatus?: ChyusenEntryInput["resultStatus"] | null;
  applicationEnd?: Date | null;
  resultDate?: Date | null;
  resultCheckedAt?: Date | null;
  purchaseCreatedAt?: Date | string | null;
};

function chyusenActivitySnapshot(entry: ChyusenActivityEntry) {
  return {
    title: entry.title || "Chyusen",
    productName: entry.productName || "",
    series: entry.series || "Pokemon",
    shop: entry.customShopName || entry.shop || "Khác",
    applicationStatus: entry.applicationStatus || "not_registered",
    resultStatus: entry.resultStatus || "pending",
    applicationEnd: serialize(entry.applicationEnd),
    resultDate: serialize(entry.resultDate),
    resultCheckedAt: serialize(entry.resultCheckedAt),
    purchaseCreatedAt: serialize(entry.purchaseCreatedAt),
  };
}

async function writeChyusenActivity(userId: number, action: string, entryId: number, description: string, before: unknown, after: unknown) {
  const db = await getDb();
  if (!db) return;
  await db.insert(activityLogs).values({
    userId,
    action,
    description,
    entityType: "chyusen",
    entityId: entryId,
    ...serializeActivityChange(before, after),
  });
}

export async function findDuplicateChyusenEntry(userId: number, input: Pick<ChyusenEntryInput, "sourceUrl" | "externalProductId" | "productName" | "shop" | "customShopName" | "applicationStart" | "applicationEnd">, excludeEntryId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  const entries = await db.select().from(chyusenEntries).where(and(eq(chyusenEntries.userId, userId), isNull(chyusenEntries.deletedAt)));
  const candidates = entries.filter((entry) => entry.id !== excludeEntryId);
  const sourceUrl = normalizeDuplicateText(input.sourceUrl);
  const sourceMatch = sourceUrl ? candidates.find((entry) => normalizeDuplicateText(entry.sourceUrl) === sourceUrl) : undefined;
  if (sourceMatch) return sourceMatch;
  const productId = normalizeDuplicateText(input.externalProductId);
  if (productId) {
    const productIdMatch = candidates.find((entry) => normalizeDuplicateText(entry.externalProductId) === productId);
    if (productIdMatch) return productIdMatch;
  }
  const productName = normalizeDuplicateText(input.productName);
  const shop = normalizeDuplicateText(input.customShopName || input.shop);
  const start = toDateKey(input.applicationStart);
  const end = toDateKey(input.applicationEnd);
  if (!productName || !shop || (!start && !end)) return undefined;
  return candidates.find((entry) => normalizeDuplicateText(entry.productName) === productName
    && normalizeDuplicateText(entry.customShopName || entry.shop) === shop
    && toDateKey(entry.applicationStart) === start
    && toDateKey(entry.applicationEnd) === end);
}

export async function listChyusenEntries(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(chyusenEntries)
    .where(and(eq(chyusenEntries.userId, userId), isNull(chyusenEntries.deletedAt)))
    .orderBy(desc(chyusenEntries.updatedAt));
  return rows.map((entry) => ({
    ...entry,
    timeState: getChyusenTimeState(entry),
    urgency: getChyusenUrgency(entry.applicationEnd),
    fieldConfidence: entry.fieldConfidence ? JSON.parse(entry.fieldConfidence) : {},
  }));
}

export async function getChyusenEntry(userId: number, entryId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [entry] = await db.select().from(chyusenEntries)
    .where(and(eq(chyusenEntries.id, entryId), eq(chyusenEntries.userId, userId), isNull(chyusenEntries.deletedAt)))
    .limit(1);
  if (!entry) return undefined;
  const history = await db.select().from(chyusenHistory)
    .where(and(eq(chyusenHistory.entryId, entryId), eq(chyusenHistory.userId, userId)))
    .orderBy(desc(chyusenHistory.createdAt));
  return {
    ...entry,
    timeState: getChyusenTimeState(entry),
    urgency: getChyusenUrgency(entry.applicationEnd),
    fieldConfidence: entry.fieldConfidence ? JSON.parse(entry.fieldConfidence) : {},
    history,
  };
}

export async function upsertChyusenSource(userId: number, sourceUrl: string, values: {
  entryId?: number;
  label?: string;
  latestStatus?: "monitoring" | "detected" | "unavailable";
  latestError?: string | null;
  contentHash?: string | null;
  lastDetectedAt?: Date | null;
  checkIntervalMinutes?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [existing] = await db.select().from(chyusenSources)
    .where(and(eq(chyusenSources.userId, userId), eq(chyusenSources.sourceUrl, sourceUrl)))
    .limit(1);
  const now = new Date();
  if (existing) {
    await db.update(chyusenSources).set({
      entryId: values.entryId ?? existing.entryId,
      label: values.label ?? existing.label,
      latestStatus: values.latestStatus ?? existing.latestStatus,
      latestError: values.latestError === undefined ? existing.latestError : values.latestError,
      contentHash: values.contentHash === undefined ? existing.contentHash : values.contentHash,
      checkIntervalMinutes: values.checkIntervalMinutes ?? existing.checkIntervalMinutes,
      lastCheckedAt: now,
      nextCheckAt: new Date(now.getTime() + (values.checkIntervalMinutes ?? existing.checkIntervalMinutes) * 60_000),
      lastDetectedAt: values.lastDetectedAt === undefined ? existing.lastDetectedAt : values.lastDetectedAt,
    }).where(eq(chyusenSources.id, existing.id));
    return { id: existing.id, created: false };
  }
  const result = await db.insert(chyusenSources).values({
    userId,
    sourceUrl,
    entryId: values.entryId ?? null,
    label: values.label ?? null,
    isActive: 1,
    latestStatus: values.latestStatus ?? "monitoring",
    latestError: values.latestError ?? null,
    contentHash: values.contentHash ?? null,
    checkIntervalMinutes: values.checkIntervalMinutes ?? 360,
    lastCheckedAt: now,
    nextCheckAt: new Date(now.getTime() + (values.checkIntervalMinutes ?? 360) * 60_000),
    lastDetectedAt: values.lastDetectedAt ?? null,
  });
  return { id: result[0].insertId, created: true };
}

export async function createChyusenEntry(userId: number, input: ChyusenEntryInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const duplicate = await findDuplicateChyusenEntry(userId, input);
  if (duplicate) throw new Error(`Chyusen này có vẻ đã tồn tại (${duplicate.title}). Hãy mở bản ghi cũ để cập nhật thay vì tạo trùng.`);
  const result = await db.insert(chyusenEntries).values({
    userId,
    title: input.title,
    productName: input.productName,
    series: input.series || "Pokemon",
    productType: input.productType || "other",
    shop: input.shop || "Khác",
    customShopName: input.customShopName || null,
    sourceUrl: input.sourceUrl || null,
    externalProductId: input.externalProductId || null,
    imageUrl: input.imageUrl || null,
    price: input.price === undefined || input.price === null ? null : String(input.price),
    quantityLimit: input.quantityLimit || null,
    applicationStart: input.applicationStart || null,
    applicationEnd: input.applicationEnd || null,
    resultDate: input.resultDate || null,
    pickupStart: input.pickupStart || null,
    pickupEnd: input.pickupEnd || null,
    pickupNote: input.pickupNote || null,
    requirements: input.requirements || null,
    applicationStatus: input.applicationStatus || "not_registered",
    resultStatus: input.resultStatus || "pending",
    resultCheckedAt: input.resultCheckedAt || null,
    sourceTimezone: input.sourceTimezone || "Asia/Tokyo",
    parserStatus: input.parserStatus || "manual",
    parserNote: input.parserNote || null,
    fieldConfidence: input.fieldConfidence ? JSON.stringify(input.fieldConfidence) : null,
    sourceContentHash: input.sourceContentHash || null,
    lastCheckedAt: input.sourceContentHash ? new Date() : null,
  });
  const entryId = result[0].insertId;
  const source = input.sourceUrl ? await upsertChyusenSource(userId, input.sourceUrl, {
    entryId,
    label: input.shop || "Nguồn Chyusen",
    latestStatus: input.parserStatus === "unavailable" ? "unavailable" : "monitoring",
    contentHash: input.sourceContentHash || null,
  }) : undefined;
  await db.insert(chyusenHistory).values({
    userId,
    entryId,
    fieldName: "created",
    oldValue: null,
    newValue: "Chyusen đã được lưu sau khi người dùng xác nhận.",
    changeSource: input.parserStatus === "manual" ? "manual" : "source_import",
  });
  await writeChyusenActivity(userId, "chyusen_created", entryId, `Thêm Chyusen: ${input.title}`, null, chyusenActivitySnapshot(input));
  if (input.customShopName?.trim()) await saveChyusenShopSuggestion(userId, input.customShopName);
  return { id: entryId, sourceId: source?.id ?? null };
}

export async function updateChyusenEntry(userId: number, entryId: number, input: Partial<ChyusenEntryInput>, changeSource: "manual" | "source_refresh" = "manual") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [existing] = await db.select().from(chyusenEntries)
    .where(and(eq(chyusenEntries.id, entryId), eq(chyusenEntries.userId, userId))).limit(1);
  if (!existing) throw new Error("Chương trình Chyusen không tồn tại hoặc không thuộc tài khoản này.");

  const duplicate = await findDuplicateChyusenEntry(userId, {
    sourceUrl: input.sourceUrl ?? existing.sourceUrl ?? "",
    externalProductId: input.externalProductId ?? existing.externalProductId ?? undefined,
    productName: input.productName ?? existing.productName,
    shop: input.shop ?? existing.shop ?? undefined,
    customShopName: input.customShopName ?? existing.customShopName ?? undefined,
    applicationStart: input.applicationStart ?? existing.applicationStart,
    applicationEnd: input.applicationEnd ?? existing.applicationEnd,
  }, entryId);
  if (duplicate) throw new Error(`Cập nhật này sẽ tạo Chyusen trùng với ${duplicate.title}. Hãy kiểm tra lại URL, Product ID hoặc lịch đăng ký.`);

  const update: Record<string, unknown> = {};
  const historyRows: Array<typeof chyusenHistory.$inferInsert> = [];
  for (const field of editableFields) {
    const value = input[field];
    if (value === undefined) continue;
    const normalized = field === "price" && value !== null ? String(value) : field === "fieldConfidence" && value !== null ? JSON.stringify(value) : value;
    const previous = (existing as Record<string, unknown>)[field];
    if (serialize(previous) !== serialize(normalized)) {
      update[field] = normalized;
      historyRows.push({
        userId,
        entryId,
        fieldName: field,
        oldValue: serialize(previous),
        newValue: serialize(normalized),
        changeSource,
      });
    }
  }
  if (Object.keys(update).length > 0) {
    await db.update(chyusenEntries).set(update).where(eq(chyusenEntries.id, entryId));
    if (historyRows.length) await db.insert(chyusenHistory).values(historyRows);
    if (changeSource === "manual") {
      const statusChanged = input.applicationStatus !== undefined || input.resultStatus !== undefined;
      const resultCheckChanged = input.resultCheckedAt !== undefined;
      await writeChyusenActivity(
        userId,
        resultCheckChanged ? "chyusen_result_checked" : statusChanged ? "chyusen_status_updated" : "chyusen_updated",
        entryId,
        `${resultCheckChanged ? "Đã kiểm tra kết quả" : statusChanged ? "Cập nhật trạng thái" : "Cập nhật"} Chyusen: ${existing.title}`,
        chyusenActivitySnapshot(existing),
        chyusenActivitySnapshot({ ...existing, ...update } as ChyusenActivityEntry),
      );
    }
    if (input.customShopName?.trim()) await saveChyusenShopSuggestion(userId, input.customShopName);
  }
  if (input.sourceUrl && input.sourceUrl !== existing.sourceUrl) {
    await upsertChyusenSource(userId, input.sourceUrl, { entryId, label: input.shop || existing.shop || "Nguồn Chyusen" });
  }
  return { updated: Object.keys(update).length > 0 };
}

export async function deleteChyusenEntry(userId: number, entryId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [entry] = await db.select().from(chyusenEntries)
    .where(and(eq(chyusenEntries.id, entryId), eq(chyusenEntries.userId, userId), isNull(chyusenEntries.deletedAt))).limit(1);
  if (!entry) throw new Error("Chương trình Chyusen không tồn tại hoặc không thuộc tài khoản này.");
  const deletedAt = new Date();
  const linkedSources = await db.select().from(chyusenSources)
    .where(and(eq(chyusenSources.userId, userId), eq(chyusenSources.entryId, entryId)));
  const trash = await createTrashItem(userId, {
    entityType: "chyusen",
    entityId: entryId,
    title: entry.title,
    snapshot: { entry, sources: linkedSources },
  });
  await db.update(chyusenEntries).set({ deletedAt }).where(eq(chyusenEntries.id, entryId));
  await db.update(chyusenNotifications).set({ deletedAt }).where(and(eq(chyusenNotifications.userId, userId), eq(chyusenNotifications.entryId, entryId)));
  await Promise.all(linkedSources.map((source) => db.update(chyusenSources).set({ isActive: 0, pausedByEntryDelete: 1, activeBeforeEntryDelete: source.isActive }).where(eq(chyusenSources.id, source.id))));
  await db.insert(chyusenHistory).values({ userId, entryId, fieldName: "deleted", oldValue: null, newValue: deletedAt.toISOString(), changeSource: "manual" });
  await writeChyusenActivity(userId, "chyusen_deleted", entryId, `Chuyển Chyusen vào Thùng rác: ${entry.title}`, chyusenActivitySnapshot(entry), null);
  return { id: entryId, title: entry.title, deletedAt, trashId: trash.id };
}

export async function restoreChyusenEntry(userId: number, entryId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [entry] = await db.select().from(chyusenEntries)
    .where(and(eq(chyusenEntries.id, entryId), eq(chyusenEntries.userId, userId), isNotNull(chyusenEntries.deletedAt))).limit(1);
  if (!entry?.deletedAt) throw new Error("Chyusen này không còn trong trạng thái có thể hoàn tác.");
  if (Date.now() - entry.deletedAt.getTime() > CHYUSEN_UNDO_WINDOW_MS) throw new Error("Thời gian hoàn tác đã hết. Chyusen vẫn được ẩn an toàn khỏi danh sách.");
  const pausedSources = await db.select().from(chyusenSources)
    .where(and(eq(chyusenSources.userId, userId), eq(chyusenSources.entryId, entryId), eq(chyusenSources.pausedByEntryDelete, 1)));
  await db.update(chyusenEntries).set({ deletedAt: null }).where(eq(chyusenEntries.id, entryId));
  await db.update(chyusenNotifications).set({ deletedAt: null }).where(and(eq(chyusenNotifications.userId, userId), eq(chyusenNotifications.entryId, entryId)));
  await Promise.all(pausedSources.map((source) => {
    const shouldResume = source.activeBeforeEntryDelete ?? 1;
    return db.update(chyusenSources).set({
      isActive: shouldResume,
      pausedByEntryDelete: 0,
      activeBeforeEntryDelete: null,
      nextCheckAt: shouldResume ? new Date() : source.nextCheckAt,
    }).where(eq(chyusenSources.id, source.id));
  }));
  await db.insert(chyusenHistory).values({ userId, entryId, fieldName: "restored", oldValue: entry.deletedAt.toISOString(), newValue: new Date().toISOString(), changeSource: "manual" });
  await markLatestTrashItemRestored(userId, "chyusen", entryId);
  await writeChyusenActivity(userId, "chyusen_restored", entryId, `Khôi phục Chyusen từ Thùng rác: ${entry.title}`, null, chyusenActivitySnapshot(entry));
  return { id: entryId, title: entry.title, restored: true };
}

export async function markChyusenPurchaseCreated(userId: number, entryId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [entry] = await db.select().from(chyusenEntries)
    .where(and(eq(chyusenEntries.id, entryId), eq(chyusenEntries.userId, userId))).limit(1);
  if (!entry) throw new Error("Chương trình Chyusen không tồn tại hoặc không thuộc tài khoản này.");
  await db.update(chyusenEntries).set({ purchaseCreatedAt: new Date() }).where(eq(chyusenEntries.id, entryId));
  await db.insert(chyusenHistory).values({
    userId,
    entryId,
    fieldName: "purchaseCreatedAt",
    oldValue: serialize(entry.purchaseCreatedAt),
    newValue: new Date().toISOString(),
    changeSource: "manual",
  });
  await writeChyusenActivity(userId, "chyusen_purchase_linked", entryId, `Xác nhận mua hàng từ Chyusen: ${entry.title}`, chyusenActivitySnapshot(entry), { ...chyusenActivitySnapshot(entry), purchaseCreatedAt: new Date().toISOString() });
}

export async function listChyusenNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chyusenNotifications)
    .where(and(eq(chyusenNotifications.userId, userId), isNull(chyusenNotifications.deletedAt)))
    .orderBy(desc(chyusenNotifications.createdAt));
}

export async function markChyusenNotificationRead(userId: number, notificationId: number, isRead: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(chyusenNotifications).set({ isRead: isRead ? 1 : 0, readAt: isRead ? new Date() : null })
    .where(and(eq(chyusenNotifications.id, notificationId), eq(chyusenNotifications.userId, userId)));
}

export async function markAllChyusenNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(chyusenNotifications).set({ isRead: 1, readAt: new Date() })
    .where(and(eq(chyusenNotifications.userId, userId), eq(chyusenNotifications.isRead, 0), isNull(chyusenNotifications.deletedAt)));
}

export async function deleteChyusenNotification(userId: number, notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [notification] = await db.select().from(chyusenNotifications)
    .where(and(eq(chyusenNotifications.id, notificationId), eq(chyusenNotifications.userId, userId), isNull(chyusenNotifications.deletedAt))).limit(1);
  if (!notification) throw new Error("Thông báo không tồn tại hoặc đã bị xóa.");
  const trash = await createTrashItem(userId, {
    entityType: "notification",
    entityId: notificationId,
    title: notification.title,
    snapshot: { notification },
  });
  await db.update(chyusenNotifications).set({ deletedAt: new Date() })
    .where(and(eq(chyusenNotifications.id, notificationId), eq(chyusenNotifications.userId, userId)));
  return { id: notificationId, trashId: trash.id };
}

export async function createChyusenNotification(values: typeof chyusenNotifications.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(chyusenNotifications).values(values).onDuplicateKeyUpdate({ set: { notificationKey: values.notificationKey } });
}

export async function getChyusenNotificationSettings(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [existing] = await db.select().from(chyusenNotificationSettings).where(eq(chyusenNotificationSettings.userId, userId)).limit(1);
  if (existing) return { ...existing, deadlineHours: JSON.parse(existing.deadlineHoursJson || "[]") as number[] };
  await db.insert(chyusenNotificationSettings).values({ userId, deadlineHoursJson: JSON.stringify(DEFAULT_CHYUSEN_DEADLINE_HOURS) });
  const [created] = await db.select().from(chyusenNotificationSettings).where(eq(chyusenNotificationSettings.userId, userId)).limit(1);
  return created ? { ...created, deadlineHours: DEFAULT_CHYUSEN_DEADLINE_HOURS } : undefined;
}

export async function updateChyusenNotificationSettings(userId: number, input: Partial<{ lotteryNew: boolean; lotteryExpiring: boolean; lotteryResult: boolean; lotteryChanged: boolean; lotteryWon: boolean; lotteryLost: boolean; deadlineHours: number[]; soundNewEnabled: boolean; soundUrgentEnabled: boolean; quietHoursEnabled: boolean; quietStart: string; quietEnd: string }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await getChyusenNotificationSettings(userId);
  const update: Record<string, unknown> = {};
  for (const key of ["lotteryNew", "lotteryExpiring", "lotteryResult", "lotteryChanged", "lotteryWon", "lotteryLost", "soundNewEnabled", "soundUrgentEnabled", "quietHoursEnabled"] as const) if (input[key] !== undefined) update[key] = input[key] ? 1 : 0;
  if (input.deadlineHours) update.deadlineHoursJson = JSON.stringify(Array.from(new Set(input.deadlineHours.filter((hour) => hour > 0 && hour <= 24 * 14))).sort((a, b) => b - a));
  if (input.quietStart !== undefined) update.quietStart = input.quietStart;
  if (input.quietEnd !== undefined) update.quietEnd = input.quietEnd;
  if (Object.keys(update).length) await db.update(chyusenNotificationSettings).set(update).where(eq(chyusenNotificationSettings.userId, userId));
  return getChyusenNotificationSettings(userId);
}

export async function listChyusenSources(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chyusenSources).where(eq(chyusenSources.userId, userId)).orderBy(desc(chyusenSources.updatedAt));
}

export async function getChyusenSource(userId: number, sourceId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [source] = await db.select().from(chyusenSources)
    .where(and(eq(chyusenSources.id, sourceId), eq(chyusenSources.userId, userId))).limit(1);
  return source;
}

export async function listDueChyusenSources(now = new Date()) {
  const db = await getDb();
  if (!db) return [];
  const active = await db.select().from(chyusenSources).where(eq(chyusenSources.isActive, 1));
  return active.filter((source) => !source.nextCheckAt || source.nextCheckAt.getTime() <= now.getTime());
}

export async function createChyusenSource(userId: number, input: ChyusenSourceInput) {
  const interval = CHYUSEN_INTERVAL_MINUTES.includes(input.checkIntervalMinutes as typeof CHYUSEN_INTERVAL_MINUTES[number]) ? input.checkIntervalMinutes! : 360;
  return upsertChyusenSource(userId, input.sourceUrl, { label: input.label ?? undefined, checkIntervalMinutes: interval });
}

export async function updateChyusenSource(userId: number, sourceId: number, input: Partial<ChyusenSourceInput>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [source] = await db.select().from(chyusenSources).where(and(eq(chyusenSources.id, sourceId), eq(chyusenSources.userId, userId))).limit(1);
  if (!source) throw new Error("Nguồn Chyusen không tồn tại hoặc không thuộc tài khoản này.");
  const interval = input.checkIntervalMinutes && CHYUSEN_INTERVAL_MINUTES.includes(input.checkIntervalMinutes as typeof CHYUSEN_INTERVAL_MINUTES[number]) ? input.checkIntervalMinutes : source.checkIntervalMinutes;
  await db.update(chyusenSources).set({
    sourceUrl: input.sourceUrl ?? source.sourceUrl,
    label: input.label === undefined ? source.label : input.label,
    isActive: input.isActive === undefined ? source.isActive : input.isActive ? 1 : 0,
    checkIntervalMinutes: interval,
    nextCheckAt: input.isActive === true ? new Date() : source.nextCheckAt,
  }).where(eq(chyusenSources.id, sourceId));
}

export async function deleteChyusenSource(userId: number, sourceId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [source] = await db.select().from(chyusenSources)
    .where(and(eq(chyusenSources.id, sourceId), eq(chyusenSources.userId, userId))).limit(1);
  if (!source) throw new Error("Nguồn theo dõi không tồn tại.");
  const trash = await createTrashItem(userId, {
    entityType: "source",
    entityId: sourceId,
    title: source.label || source.sourceUrl,
    snapshot: { source },
  });
  await db.delete(chyusenSources).where(and(eq(chyusenSources.id, sourceId), eq(chyusenSources.userId, userId)));
  return { id: sourceId, trashId: trash.id };
}

export async function recordChyusenSourceHistory(input: typeof chyusenSourceHistory.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(chyusenSourceHistory).values(input).onDuplicateKeyUpdate({ set: { currentHash: input.currentHash } });
}

export async function listChyusenSourceHistory(userId: number, sourceId?: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chyusenSourceHistory)
    .where(sourceId ? and(eq(chyusenSourceHistory.userId, userId), eq(chyusenSourceHistory.sourceId, sourceId)) : eq(chyusenSourceHistory.userId, userId))
    .orderBy(desc(chyusenSourceHistory.createdAt));
}

export async function getChyusenMonitorConfig() {
  const db = await getDb();
  if (!db) return undefined;
  const [config] = await db.select().from(chyusenMonitorConfig).limit(1);
  return config;
}

export async function setChyusenMonitorTask(taskUid: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [config] = await db.select().from(chyusenMonitorConfig).limit(1);
  if (config) {
    await db.update(chyusenMonitorConfig).set({ scheduleCronTaskUid: taskUid, isEnabled: 1 }).where(eq(chyusenMonitorConfig.id, config.id));
  } else {
    await db.insert(chyusenMonitorConfig).values({
      scheduleCronTaskUid: taskUid,
      cronExpression: "0 0 * * * *",
      isEnabled: 1,
    });
  }
}

export async function updateChyusenSourceStatus(sourceId: number, update: { latestStatus?: "monitoring" | "detected" | "unavailable"; latestError?: string | null; contentHash?: string | null; lastDetectedAt?: Date | null; nextCheckAt?: Date | null; failureCount?: number; detectedCount?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(chyusenSources).set({ ...update, lastCheckedAt: new Date() }).where(eq(chyusenSources.id, sourceId));
}

export async function listChyusenEntriesByIds(userId: number, entryIds: number[]) {
  const db = await getDb();
  if (!db || entryIds.length === 0) return [];
  return db.select().from(chyusenEntries).where(and(eq(chyusenEntries.userId, userId), inArray(chyusenEntries.id, entryIds)));
}
