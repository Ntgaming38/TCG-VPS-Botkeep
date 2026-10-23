import { COOKIE_NAME, REMEMBERED_SESSION_MS } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { getSessionCookieOptions } from "./_core/cookies";
import { LOGOUT_ALL_CONFIRMATION } from "../shared/sessionDevice";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { parse as parseCookieHeader } from "cookie";
import * as db from "./db";
import { sdk } from "./_core/sdk";
import { hashPassword, verifyPassword } from "./_core/passwordAuth";
import { invokeLLM } from "./_core/llm";
import { extractAssistantText } from "./aiResponse";
import { buildTcgAssistantSystemPrompt } from "./tcgAssistantPrompt";
import * as chyusenDb from "./chyusenDb";
import { parseChyusenUrl } from "./chyusenSource";
import { validatePublicChyusenUrl } from "./chyusenUtils";
import { formatChyusenDayMonth, isChyusenResultReady } from "@shared/chyusenDate";
import { checkChyusenSourceNow } from "./chyusenMonitor";
import { analyzeChyusenImage, analyzeChyusenImages } from "./chyusenImageAnalysis";
import { emptyTrashItems, getTrashAutoCleanupSettings, listTrashItems, listTrashItemsForBackup, saveTrashAutoCleanupSettings, setTrashAutoCleanupTask, TRASH_AUTO_CLEANUP_CRON } from "./trashDb";
import { restoreTrashItem } from "./trashRestore";
import { createHeartbeatJob, updateHeartbeatJob } from "./_core/heartbeat";
import { uploadLoginBackground } from "./loginBackground";
import { normalizeCardRank } from "@shared/cardRank";
import { uploadUserAvatar } from "./userProfile";
import { createDataBackupPayload, DATA_BACKUP_SCOPES } from "@shared/dataBackupExport";
import { dataBackupRestoreSchema } from "@shared/dataBackupRestore";
import { restoreDataBackup } from "./dataRestore";
import { createMonthlyReport } from "@shared/monthlyReport";
import { createManualStoredBackup, getAutoBackupSettings, listBackupArchives, listBackupRestoreHistory, AUTO_BACKUP_CRON, saveAutoBackupSettings, type AutoBackupFrequency } from "./backupScheduler";
import { getReportBranding, saveReportBranding, uploadReportLogo } from "./reportBranding";
import * as snkrShopDb from "./snkrShopDb";

const chyusenEntryBase = z.object({
  title: z.string().trim().min(1).max(255),
  productName: z.string().trim().min(1).max(255),
  series: z.string().trim().max(100).optional(),
  productType: z.enum(["card", "box", "pack", "set", "other"]).optional(),
  shop: z.string().trim().max(100).optional(),
  customShopName: z.string().trim().max(255).optional(),
  sourceUrl: z.string().trim().url().max(2048).optional().or(z.literal("")),
  externalProductId: z.string().trim().max(255).optional(),
  imageUrl: z.string().trim().url().optional().or(z.literal("")),
  price: z.number().min(0).nullable().optional(),
  quantityLimit: z.string().trim().max(100).optional(),
  applicationStart: z.date().nullable().optional(),
  applicationEnd: z.date().nullable().optional(),
  resultDate: z.date().nullable().optional(),
  pickupStart: z.date().nullable().optional(),
  pickupEnd: z.date().nullable().optional(),
  pickupNote: z.string().trim().max(500).optional(),
  requirements: z.string().trim().max(4000).optional(),
  applicationStatus: z.enum(["not_registered", "registered", "cancelled", "won", "lost", "not_participating"]).optional(),
  resultStatus: z.enum(["pending", "won", "lost", "unknown"]).optional(),
  sourceTimezone: z.string().trim().max(64).optional(),
  parserStatus: z.enum(["manual", "partial", "detected", "unavailable"]).optional(),
  parserNote: z.string().trim().max(1000).optional(),
  fieldConfidence: z.record(z.string(), z.enum(["detected", "needs_review", "missing"])).optional(),
  sourceContentHash: z.string().trim().max(64).nullable().optional(),
});

// UI lưu thủ công hiển thị validation bắt buộc; API vẫn giữ dữ liệu ngày tùy chọn
// để tương thích với nguồn công khai chưa công bố đầy đủ lịch.
const chyusenEntryInput = chyusenEntryBase;

function validateChyusenSourceUrl(sourceUrl: string) {
  const result = validatePublicChyusenUrl(sourceUrl);
  if (!result.valid || !result.normalizedUrl) throw new Error(result.reason || "URL Chyusen không hợp lệ.");
  return result.normalizedUrl;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    updateProfile: protectedProcedure
      .input(z.object({
        nickname: z.string().trim().max(60).optional(),
        avatarUrl: z.string().trim().max(2048).nullable().optional(),
        avatarBorderColor: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (input.avatarUrl && !input.avatarUrl.startsWith("/manus-storage/")) {
          throw new Error("Ảnh đại diện không hợp lệ.");
        }
        return db.updateUserProfile(ctx.user.id, {
          nickname: input.nickname === undefined ? undefined : input.nickname || null,
          avatarUrl: input.avatarUrl,
          avatarBorderColor: input.avatarBorderColor,
        });
      }),
    changePassword: protectedProcedure
      .input(z.object({
        currentPassword: z.string().min(1).max(128),
        newPassword: z.string().min(8).max(128),
      }))
      .mutation(async ({ ctx, input }) => {
        const canChangePassword = ctx.user.loginMethod === "password" || (ctx.user.role === "admin" && ctx.user.loginMethod === "local");
        if (!canChangePassword) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Tài khoản này đổi mật khẩu tại nhà cung cấp đăng nhập." });
        }
        const credential = await db.getAuthCredentialByUserId(ctx.user.id);
        if (!credential || !(await verifyPassword(input.currentPassword, credential.passwordHash))) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Mật khẩu hiện tại không đúng." });
        }
        if (await verifyPassword(input.newPassword, credential.passwordHash)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Mật khẩu mới phải khác mật khẩu hiện tại." });
        }
        const updatedUser = await db.changeLocalAccountPassword(ctx.user.id, await hashPassword(input.newPassword));
        if (!updatedUser) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy thông tin mật khẩu của tài khoản." });
        const sessionToken = await sdk.createSessionToken(updatedUser.openId, {
          name: updatedUser.name || updatedUser.email || "User",
          sessionVersion: updatedUser.sessionVersion,
          expiresInMs: REMEMBERED_SESSION_MS,
        });
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...getSessionCookieOptions(ctx.req),
          maxAge: REMEMBERED_SESSION_MS,
        });
        return { success: true } as const;
      }),
    uploadAvatar: protectedProcedure
      .input(z.object({ imageDataUrl: z.string().trim().min(64).max(4_500_000) }))
      .mutation(({ ctx, input }) => uploadUserAvatar(ctx.user.id, input.imageDataUrl)),
    loginHistory: protectedProcedure.query(({ ctx }) => db.listLoginEvents(ctx.user.id)),
    logoutAll: protectedProcedure
      .input(z.object({ confirmation: z.literal(LOGOUT_ALL_CONFIRMATION) }))
      .mutation(async ({ ctx }) => {
        await db.revokeAllUserSessions(ctx.user.id);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
        return { success: true } as const;
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  backup: router({
    exportData: protectedProcedure
      .input(z.object({ scope: z.enum(DATA_BACKUP_SCOPES) }))
      .mutation(async ({ ctx, input }) => {
        const [inventory, purchaseRows, saleRows, chyusenEntries, chyusenSources, chyusenNotifications, chyusenSettings, shopRows, saleLocationRows, snkrShopItems, trashRows, branding, user, activityRows] = await Promise.all([
          db.listProducts(ctx.user.id, { status: "all" }),
          db.listPurchases(ctx.user.id),
          db.listSales(ctx.user.id),
          chyusenDb.listChyusenEntries(ctx.user.id),
          chyusenDb.listChyusenSources(ctx.user.id),
          chyusenDb.listChyusenNotifications(ctx.user.id),
          chyusenDb.getChyusenNotificationSettings(ctx.user.id),
          db.listShops(ctx.user.id),
          db.listSaleLocations(ctx.user.id),
          snkrShopDb.listSnkrShopItems(ctx.user.id),
          listTrashItemsForBackup(ctx.user.id),
          getReportBranding(ctx.user.id),
          db.getUserById(ctx.user.id),
          db.listAllActivityLogsForBackup(ctx.user.id),
        ]);

        return createDataBackupPayload(input.scope, {
          inventory,
          purchases: purchaseRows,
          sales: saleRows,
          chyusen: {
            entries: chyusenEntries,
            sources: chyusenSources,
            notifications: chyusenNotifications,
            notificationSettings: chyusenSettings,
          },
          shops: shopRows,
          saleLocations: saleLocationRows,
          snkrShop: { items: snkrShopItems },
          trash: trashRows,
          reportBranding: branding ? { accentColor: branding.accentColor, logoUrl: branding.logoUrl } : null,
          userProfile: user ? { nickname: user.nickname ?? null, avatarUrl: user.avatarUrl ?? null, avatarBorderColor: user.avatarBorderColor ?? null, language: user.language ?? null, currency: user.currency ?? null } : null,
          activityLogs: activityRows,
        });
      }),
    restorePreview: protectedProcedure
      .input(z.object({ backup: dataBackupRestoreSchema }))
      .query(({ input }) => ({
        exportedAt: input.backup.exportedAt,
        scope: input.backup.scope,
        inventoryCount: input.backup.inventory?.length || 0,
        purchaseCount: input.backup.purchases?.length || 0,
        saleCount: input.backup.sales?.length || 0,
        chyusenCount: input.backup.chyusen?.entries?.length || 0,
        shopCount: input.backup.shops?.length || 0,
        saleLocationCount: input.backup.saleLocations?.length || 0,
        snkrShopCount: input.backup.snkrShop?.items?.length || 0,
        trashCount: input.backup.trash?.length || 0,
        activityLogCount: input.backup.activityLogs?.length || 0,
      })),
    restoreData: protectedProcedure
      .input(z.object({ backup: dataBackupRestoreSchema, sourceFileName: z.string().trim().max(255).optional(), mode: z.enum(["merge", "overwrite"]).default("merge"), confirmed: z.literal(true) }))
      .mutation(async ({ ctx, input }) => restoreDataBackup(ctx.user.id, input.backup, input.sourceFileName, input.mode)),
    restoreHistory: protectedProcedure.query(({ ctx }) => listBackupRestoreHistory(ctx.user.id)),
    archives: protectedProcedure.query(({ ctx }) => listBackupArchives(ctx.user.id)),
    createStoredSnapshot: protectedProcedure.mutation(({ ctx }) => createManualStoredBackup(ctx.user.id)),
    autoBackupStatus: protectedProcedure.query(async ({ ctx }) => {
      const settings = await getAutoBackupSettings(ctx.user.id);
      return settings ?? { isEnabled: 0, frequency: "weekly" as const, cronExpression: AUTO_BACKUP_CRON.weekly, lastRunAt: null, lastRunStatus: null, lastRunSummary: null };
    }),
    updateAutoBackup: protectedProcedure
      .input(z.object({ isEnabled: z.boolean().optional(), frequency: z.enum(["weekly", "monthly"]).optional() }))
      .mutation(async ({ ctx, input }) => {
        // Tự lưu cấu hình; việc chạy do cron của VPS gọi /api/scheduled/auto-backup với x-cron-secret.
        const updated = await saveAutoBackupSettings(ctx.user.id, { frequency: input.frequency as AutoBackupFrequency | undefined, isEnabled: input.isEnabled });
        if (!updated) throw new Error("Không thể lưu cấu hình sao lưu tự động.");
        return updated;
      }),
  }),

  reportBranding: router({
    get: protectedProcedure.query(({ ctx }) => getReportBranding(ctx.user.id)),
    update: protectedProcedure.input(z.object({ accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(), logoUrl: z.string().max(2048).nullable().optional() })).mutation(({ ctx, input }) => {
      if (input.logoUrl && !input.logoUrl.startsWith("/manus-storage/")) throw new Error("Logo báo cáo không hợp lệ.");
      return saveReportBranding(ctx.user.id, input);
    }),
    uploadLogo: protectedProcedure.input(z.object({ imageDataUrl: z.string().trim().min(64).max(4_500_000) })).mutation(({ ctx, input }) => uploadReportLogo(ctx.user.id, input.imageDataUrl)),
  }),

  ai: router({
    chat: protectedProcedure
      .input(z.object({
        messages: z.array(z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().trim().min(1).max(2000),
        })).min(1).max(12),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          const cardProducts = await db.listProducts(ctx.user.id, { type: "card" });
          const cardAnalysis = cardProducts.map((p: any) => {
            const buyP = Number(p.buyPrice || 0);
            const marketP = Number(p.marketPrice || buyP);
            const unrealizedProfit = (marketP - buyP) * Math.max(0, p.quantity - (p.damagedQuantity || 0));
            const roi = buyP > 0 ? Number((((marketP - buyP) / buyP) * 100).toFixed(1)) : 0;
            return {
              id: p.id,
              name: p.name,
              buyPrice: buyP,
              marketPrice: marketP,
              suggestedMarketPrice: marketP,
              unrealizedProfit,
              roi,
              quantity: p.quantity,
            };
          });
          cardAnalysis.sort((a, b) => b.unrealizedProfit - a.unrealizedProfit);
          const stats = await db.getDashboardStats(ctx.user.id);
          const context = {
            dashboard: stats,
            topCardsAnalysis: cardAnalysis.slice(0, 10),
          };

          const response = await invokeLLM({
            model: "claude-haiku-4-5",
            maxTokens: 1000,
            messages: [
              {
                role: "system",
                content: buildTcgAssistantSystemPrompt(context),
              },
              ...input.messages.map((m) => ({ role: m.role, content: m.content })),
            ],
          });

          const content = extractAssistantText(response);
          if (!content) {
            throw new Error(`LLM không trả về nội dung hiển thị được (finish_reason: ${response.choices?.[0]?.finish_reason ?? "unknown"}).`);
          }
          return content;
        } catch (error) {
          console.error("AI chat error:", error);
          return "Xin lỗi, hiện tại Trợ lý AI chưa thể hoàn tất phân tích. Vui lòng thử lại sau ít phút.";
        }
      }),

    analysisChartData: protectedProcedure
      .query(async ({ ctx }) => {
        const cardProducts = await db.listProducts(ctx.user.id, { type: "card" });
        const cardAnalysis = cardProducts.map((p: any) => {
          const buyP = Number(p.buyPrice || 0);
          const marketP = Number(p.marketPrice || buyP);
          const unrealizedProfit = (marketP - buyP) * Math.max(0, p.quantity - (p.damagedQuantity || 0));
          const roi = buyP > 0 ? Number((((marketP - buyP) / buyP) * 100).toFixed(1)) : 0;
          return {
            id: p.id,
            name: p.name,
            buyPrice: buyP,
            marketPrice: marketP,
            suggestedMarketPrice: marketP,
            unrealizedProfit,
            roi,
          };
        });
        cardAnalysis.sort((a, b) => b.unrealizedProfit - a.unrealizedProfit);

        const stats = await db.getDashboardStats(ctx.user.id);
        return {
          dashboard: stats,
          topCardsAnalysis: cardAnalysis.slice(0, 10),
          inventorySummary: {
            totalCardsInStock: cardProducts.reduce((sum: number, p: any) => sum + p.quantity, 0),
            linkedToSnkrdunk: cardProducts.filter((p: any) => Boolean(p.snkrdunkUrl)).length,
          },
        };
      }),
  }),

  loginBackground: router({
    upload: protectedProcedure
      .input(z.object({ imageDataUrl: z.string().trim().min(64).max(6_000_000) }))
      .mutation(({ ctx, input }) => uploadLoginBackground(ctx.user.id, input.imageDataUrl)),
  }),

  products: router({
    list: protectedProcedure
      .input(z.object({
        type: z.string().optional(),
        status: z.string().optional(),
        search: z.string().optional(),
      }).optional())
      .query(({ ctx, input }) => db.listProducts(ctx.user.id, input)),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ ctx, input }) => db.getProductByIdForUser(input.id, ctx.user.id)),

    suggestions: protectedProcedure
      .input(z.object({ search: z.string() }))
      .query(({ ctx, input }) => db.getProductSuggestions(ctx.user.id, input.search)),

    inStock: protectedProcedure
      .query(({ ctx }) => db.getInStockProducts(ctx.user.id)),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        type: z.enum(["card", "box", "pack", "junk_pack"]),
        series: z.string().optional(),
        setName: z.string().optional(),
        quantity: z.number().min(0).default(1),
        buyPrice: z.number().min(0).default(0),
        marketPrice: z.number().min(0).optional(),
        sellPrice: z.number().min(0).optional(),
        description: z.string().optional(),
        cardNumber: z.string().optional(),
        language: z.string().optional(),
        rarity: z.string().optional(),
        condition: z.string().optional(),
        psaGrade: z.string().optional(),
        releaseDate: z.string().optional(),
        image: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => db.createProduct({
        userId: ctx.user.id,
        name: input.name,
        type: input.type,
        series: input.series || "Pokemon",
        setName: input.setName,
        quantity: input.quantity,
        buyPrice: String(input.buyPrice),
        marketPrice: input.marketPrice ? String(input.marketPrice) : undefined,
        sellPrice: input.sellPrice ? String(input.sellPrice) : undefined,
        description: input.description,
        cardNumber: input.cardNumber,
        language: input.language || "Japanese",
        rarity: input.rarity,
        condition: input.type === "card" ? normalizeCardRank(input.condition) : input.condition || "A",
        psaGrade: input.psaGrade,
        releaseDate: input.releaseDate,
        image: input.image,
        status: "in_stock",
      })),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        type: z.enum(["card", "box", "pack", "junk_pack"]).optional(),
        name: z.string().optional(),
        series: z.string().optional(),
        setName: z.string().optional(),
        quantity: z.number().optional(),
        buyPrice: z.number().optional(),
        marketPrice: z.number().optional(),
        sellPrice: z.number().optional(),
        description: z.string().optional(),
        cardNumber: z.string().optional(),
        language: z.string().optional(),
        rarity: z.string().optional(),
        condition: z.string().optional(),
        psaGrade: z.string().optional(),
        releaseDate: z.string().optional(),
        image: z.string().optional(),
        imageZoom: z.number().min(1).max(1.5).optional(),
        imagePositionX: z.number().min(-50).max(50).optional(),
        imagePositionY: z.number().min(-50).max(50).optional(),
        status: z.enum(["in_stock", "sold", "reserved", "traded", "damaged"]).optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        const updateData: any = {};
        Object.entries(data).forEach(([key, val]) => {
          if (val !== undefined) {
            if (['buyPrice', 'marketPrice', 'sellPrice'].includes(key)) {
              updateData[key] = String(val);
            } else {
              updateData[key] = val;
            }
          }
        });
        return db.updateProduct(id, ctx.user.id, updateData);
      }),

    updateImageZoom: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), imageZoom: z.number().min(1).max(1.5), imagePositionX: z.number().min(-50).max(50).optional(), imagePositionY: z.number().min(-50).max(50).optional() }))
      .mutation(({ ctx, input }) => db.updateProductImageZoom(input.id, ctx.user.id, input.imageZoom, input.imagePositionX, input.imagePositionY)),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => db.deleteProduct(input.id, ctx.user.id)),

    updateMarketPrice: protectedProcedure
      .input(z.object({ id: z.number(), marketPrice: z.number() }))
      .mutation(({ ctx, input }) => db.updateMarketPrice(input.id, ctx.user.id, String(input.marketPrice))),

    priceHistory: protectedProcedure
      .input(z.object({ productId: z.number().int().positive(), days: z.union([z.literal(7), z.literal(30), z.literal(90)]).optional() }))
      .query(({ ctx, input }) => db.getProductPriceHistory(input.productId, ctx.user.id, input.days)),

    priceChanges24h: protectedProcedure
      .query(({ ctx }) => db.getMarketplace24hChanges(ctx.user.id)),

    updateSnkrdunkUrl: protectedProcedure
      .input(z.object({ id: z.number(), snkrdunkUrl: z.string().url() }))
      .mutation(({ ctx, input }) => db.updateSnkrdunkUrl(input.id, ctx.user.id, input.snkrdunkUrl)),

    refreshImageFromSnkrdunk: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ ctx, input }) => db.refreshProductImageFromSnkrdunk(input.id, ctx.user.id)),

    whitenImage: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ ctx, input }) => db.whitenProductImage(input.id, ctx.user.id)),

    syncSnkrdunkPrice: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => db.syncSnkrdunkPriceForProduct(input.id, ctx.user.id)),

    syncAllSnkrdunk: protectedProcedure
      .mutation(({ ctx }) => db.syncAllSnkrdunkPrices(ctx.user.id)),

    syncErrorHistory: protectedProcedure
      .query(({ ctx }) => db.getMarketplaceSyncErrorHistory(ctx.user.id)),

    retrySyncError: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ ctx, input }) => db.retryMarketplaceSyncError(input.id, ctx.user.id)),

    autoSyncStatus: protectedProcedure
      .query(() => db.getMarketplaceAutoSyncStatus()),

    updateAutoSyncSettings: protectedProcedure
      .input(z.object({ isEnabled: z.boolean().optional(), batchSize: z.number().int().min(1).max(20).optional() }))
      .mutation(({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new Error("Chỉ quản trị viên mới có thể thay đổi đồng bộ Marketplace tự động.");
        return db.updateMarketplaceAutoSyncSettings(input);
      }),

    markDamaged: protectedProcedure
      .input(z.object({
        productId: z.number(),
        damagedQty: z.number().min(1),
        damageNote: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => db.markProductAsDamaged(ctx.user.id, input)),

    damaged: protectedProcedure
      .query(({ ctx }) => db.getDamagedProducts(ctx.user.id)),
  }),

  snkrShop: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().trim().max(255).optional() }).optional())
      .query(({ ctx, input }) => snkrShopDb.listSnkrShopItems(ctx.user.id, input?.search)),
    get: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(({ ctx, input }) => snkrShopDb.getSnkrShopItem(input.id, ctx.user.id)),
    create: protectedProcedure
      .input(z.object({
        name: z.string().trim().min(1).max(255).optional(),
        productType: z.enum(["card", "box", "pack"]),
        cardRank: z.enum(["A", "B", "C", "D"]).optional(),
        sourceUrl: z.string().trim().url().max(2048),
      }))
      .mutation(({ ctx, input }) => snkrShopDb.createSnkrShopItem(ctx.user.id, input)),
    update: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        name: z.string().trim().min(1).max(255).optional(),
        productType: z.enum(["card", "box", "pack"]).optional(),
        cardRank: z.enum(["A", "B", "C", "D"]).optional(),
        sourceUrl: z.string().trim().url().max(2048).optional(),
        imageZoom: z.number().min(1).max(1.5).optional(),
        imagePositionX: z.number().min(-50).max(50).optional(),
        imagePositionY: z.number().min(-50).max(50).optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { id, ...changes } = input;
        return snkrShopDb.updateSnkrShopItem(id, ctx.user.id, changes);
      }),
    updateImageZoom: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), imageZoom: z.number().min(1).max(1.5), imagePositionX: z.number().min(-50).max(50).optional(), imagePositionY: z.number().min(-50).max(50).optional() }))
      .mutation(({ ctx, input }) => snkrShopDb.updateSnkrShopItemImageZoom(input.id, ctx.user.id, input.imageZoom, input.imagePositionX, input.imagePositionY)),
    whitenImage: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ ctx, input }) => snkrShopDb.whitenSnkrShopImage(input.id, ctx.user.id)),
    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ ctx, input }) => snkrShopDb.deleteSnkrShopItem(input.id, ctx.user.id)),
    sync: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ ctx, input }) => snkrShopDb.syncSnkrShopItem(input.id, ctx.user.id)),
    syncAll: protectedProcedure
      .mutation(({ ctx }) => snkrShopDb.syncAllSnkrShopItems(ctx.user.id)),
    priceHistory: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), days: z.union([z.literal(7), z.literal(30), z.literal(90)]).optional() }))
      .query(({ ctx, input }) => snkrShopDb.getSnkrShopPriceHistory(input.id, ctx.user.id, input.days)),
    trendHistory7d: protectedProcedure
      .query(({ ctx }) => snkrShopDb.getSnkrShop7dHistory(ctx.user.id)),
    quantityPrices: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(({ ctx, input }) => snkrShopDb.getSnkrShopQuantityPrices(input.id, ctx.user.id)),
  }),

  purchases: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().optional() }).optional())
      .query(({ ctx, input }) => db.listPurchases(ctx.user.id, input)),

    create: protectedProcedure
      .input(z.object({
        productName: z.string().min(1),
        productType: z.enum(["card", "box", "pack", "junk_pack"]).default("card"),
        series: z.string().optional(),
        shop: z.string().optional(),
        purchaseType: z.string().optional(),
        quantity: z.number().min(1).default(1),
        price: z.number().min(0),
        note: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => db.createPurchase(ctx.user.id, input)),

    update: protectedProcedure
      .input(z.object({
        purchaseId: z.number(),
        quantity: z.number().min(1).optional(),
        price: z.number().min(0).optional(),
        shop: z.string().optional(),
        note: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => db.updatePurchase(ctx.user.id, input)),

    delete: protectedProcedure
      .input(z.object({ purchaseId: z.number() }))
      .mutation(({ ctx, input }) => db.deletePurchase(ctx.user.id, input.purchaseId)),
  }),

  sales: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().optional() }).optional())
      .query(({ ctx, input }) => db.listSales(ctx.user.id, input)),

    create: protectedProcedure
      .input(z.object({
        productId: z.number(),
        quantity: z.number().min(1).default(1),
        salePrice: z.number().min(0),
        isDamaged: z.boolean().optional(),
        platform: z.string().optional(),
        saleLocation: z.string().max(120).nullable().optional(),
        fee: z.number().optional(),
        shippingFee: z.number().optional(),
        otherCost: z.number().optional(),
        note: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => db.createSale(ctx.user.id, input)),

    update: protectedProcedure
      .input(z.object({
        saleId: z.number(),
        quantity: z.number().min(1).optional(),
        salePrice: z.number().min(0).optional(),
        note: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => db.updateSale(ctx.user.id, input)),

    delete: protectedProcedure
      .input(z.object({ saleId: z.number() }))
      .mutation(({ ctx, input }) => db.deleteSale(ctx.user.id, input.saleId)),
  }),

  trash: router({
    list: protectedProcedure
      .input(z.object({ entityType: z.string().max(64).optional() }).optional())
      .query(async ({ ctx, input }) => {
        const items = await listTrashItems(ctx.user.id);
        return input?.entityType ? items.filter((item) => item.entityType === input.entityType) : items;
      }),
    restore: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ ctx, input }) => restoreTrashItem(ctx.user.id, input.id)),
    restoreMany: protectedProcedure
      .input(z.object({ ids: z.array(z.number().int().positive()).min(1).max(100) }))
      .mutation(async ({ ctx, input }) => {
        const ids = Array.from(new Set(input.ids));
        const restored = [];
        for (const id of ids) restored.push(await restoreTrashItem(ctx.user.id, id));
        return { restoredCount: restored.length, titles: restored.map((item) => item.title) };
      }),
    empty: protectedProcedure
      .input(z.object({ confirmed: z.literal(true) }))
      .mutation(({ ctx }) => emptyTrashItems(ctx.user.id)),
    purgeMany: protectedProcedure
      .input(z.object({ ids: z.array(z.number().int().positive()).min(1).max(100), confirmed: z.literal(true) }))
      .mutation(({ ctx, input }) => emptyTrashItems(ctx.user.id, input.ids)),
    autoCleanupStatus: protectedProcedure
      .query(async ({ ctx }) => {
        const settings = await getTrashAutoCleanupSettings(ctx.user.id);
        return settings ?? { isEnabled: 0, retentionDays: 30, cronExpression: TRASH_AUTO_CLEANUP_CRON, lastRunAt: null, lastRunStatus: null, lastRunSummary: null };
      }),
    updateAutoCleanupSettings: protectedProcedure
      .input(z.object({ isEnabled: z.boolean().optional(), retentionDays: z.number().int().min(1).max(365).optional() }))
      .mutation(async ({ ctx, input }) => {
        const current = await getTrashAutoCleanupSettings(ctx.user.id);
        const shouldEnable = input.isEnabled ?? Boolean(current?.isEnabled);
        const updated = await saveTrashAutoCleanupSettings(ctx.user.id, { ...input, isEnabled: false });
        if (!updated) throw new Error("Không thể lưu cấu hình tự động dọn Thùng rác.");

        if (shouldEnable) {
          const sessionToken = parseCookieHeader(ctx.req.headers.cookie ?? "")[COOKIE_NAME];
          if (!sessionToken) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để bật tự động dọn.");
          if (updated.scheduleCronTaskUid) {
            await updateHeartbeatJob(updated.scheduleCronTaskUid, { cron: TRASH_AUTO_CLEANUP_CRON, path: "/api/scheduled/trash-auto-cleanup", enable: true }, sessionToken);
          } else {
            const job = await createHeartbeatJob({ name: `trash-auto-cleanup-${ctx.user.id}`, cron: TRASH_AUTO_CLEANUP_CRON, path: "/api/scheduled/trash-auto-cleanup", description: `Tự động dọn Thùng rác cho tài khoản ${ctx.user.id}` }, sessionToken);
            await setTrashAutoCleanupTask(ctx.user.id, job.taskUid);
          }
          await saveTrashAutoCleanupSettings(ctx.user.id, { isEnabled: true, retentionDays: input.retentionDays });
        } else if (updated.scheduleCronTaskUid) {
          const sessionToken = parseCookieHeader(ctx.req.headers.cookie ?? "")[COOKIE_NAME];
          if (sessionToken) await updateHeartbeatJob(updated.scheduleCronTaskUid, { enable: false }, sessionToken);
        }

        return (await getTrashAutoCleanupSettings(ctx.user.id)) ?? updated;
      }),
  }),

  activities: router({
    list: protectedProcedure
      .input(z.object({
        entityType: z.enum(["product", "purchase", "sale", "shop", "chyusen"]).optional(),
        action: z.string().trim().min(1).max(100).optional(),
        syncScope: z.enum(["only", "exclude"]).optional(),
        search: z.string().trim().max(100).optional(),
        limit: z.number().int().min(10).max(100).default(25),
        cursor: z.object({ id: z.number().int().positive(), createdAt: z.date() }).optional(),
      }).optional())
      .query(({ ctx, input }) => db.listActivityLogs(ctx.user.id, input)),
    sensitive: protectedProcedure
      .input(z.object({ limit: z.number().int().min(5).max(50).default(20) }).optional())
      .query(({ ctx, input }) => db.listSensitiveActivityLogs(ctx.user.id, input?.limit)),
  }),

  chyusen: router({
    list: protectedProcedure.query(({ ctx }) => chyusenDb.listChyusenEntries(ctx.user.id)),

    shopSuggestions: protectedProcedure.query(({ ctx }) => chyusenDb.listChyusenShopSuggestions(ctx.user.id)),

    shopSuggestionDetails: protectedProcedure.query(({ ctx }) => chyusenDb.listChyusenShopSuggestionsForManagement(ctx.user.id)),

    recentShops: protectedProcedure.query(({ ctx }) => chyusenDb.listRecentChyusenShops(ctx.user.id)),

    saveShopSuggestion: protectedProcedure
      .input(z.object({ name: z.string().trim().min(1).max(120) }))
      .mutation(({ ctx, input }) => chyusenDb.saveChyusenShopSuggestion(ctx.user.id, input.name)),

    updateShopSuggestion: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().trim().min(1).max(120) }))
      .mutation(({ ctx, input }) => chyusenDb.updateChyusenShopSuggestion(ctx.user.id, input.id, input.name)),

    deleteShopSuggestion: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => chyusenDb.deleteChyusenShopSuggestion(ctx.user.id, input.id)),

    setShopSuggestionPinned: protectedProcedure
      .input(z.object({ id: z.number(), isPinned: z.boolean() }))
      .mutation(({ ctx, input }) => chyusenDb.setChyusenShopSuggestionPinned(ctx.user.id, input.id, input.isPinned)),

    reorderPinnedShopSuggestions: protectedProcedure
      .input(z.object({ orderedIds: z.array(z.number().int().positive()).max(50) }))
      .mutation(({ ctx, input }) => chyusenDb.reorderPinnedChyusenShopSuggestions(ctx.user.id, input.orderedIds)),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ ctx, input }) => chyusenDb.getChyusenEntry(ctx.user.id, input.id)),

    resultHistory: protectedProcedure.query(({ ctx }) => chyusenDb.listChyusenResultHistory(ctx.user.id)),

    shopStats: protectedProcedure.query(({ ctx }) => chyusenDb.summarizeChyusenShopStatsForUser(ctx.user.id)),

    previewUrl: protectedProcedure
      .input(z.object({ sourceUrl: z.string().trim().url().max(2048) }))
      .mutation(({ input }) => parseChyusenUrl(validateChyusenSourceUrl(input.sourceUrl), true)),

    analyzeImage: protectedProcedure
      .input(z.object({ imageDataUrl: z.string().trim().min(64).max(7_000_000) }))
      .mutation(({ input }) => analyzeChyusenImage(input.imageDataUrl)),

    analyzeImages: protectedProcedure
      .input(z.object({ imageDataUrls: z.array(z.string().trim().min(64).max(3_500_000)).min(1).max(8) }))
      .mutation(({ input }) => analyzeChyusenImages(input.imageDataUrls)),

    refreshPreview: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const entry = await chyusenDb.getChyusenEntry(ctx.user.id, input.id);
        if (!entry?.sourceUrl) throw new Error("Không tìm thấy URL gốc của Chyusen này.");
        return parseChyusenUrl(validateChyusenSourceUrl(entry.sourceUrl), true);
      }),

    create: protectedProcedure
      .input(chyusenEntryInput)
      .mutation(({ ctx, input }) => {
        const { sourceContentHash, ...data } = input;
        return chyusenDb.createChyusenEntry(ctx.user.id, {
          ...data,
          sourceUrl: data.sourceUrl ? validateChyusenSourceUrl(data.sourceUrl) : undefined,
          imageUrl: data.imageUrl || undefined,
          sourceContentHash: sourceContentHash || undefined,
        });
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number(), data: chyusenEntryBase.partial() }))
      .mutation(({ ctx, input }) => {
        const { sourceContentHash, ...data } = input.data;
        return chyusenDb.updateChyusenEntry(ctx.user.id, input.id, {
          ...data,
          sourceUrl: data.sourceUrl ? validateChyusenSourceUrl(data.sourceUrl) : undefined,
          imageUrl: data.imageUrl || undefined,
          sourceContentHash: sourceContentHash || undefined,
        });
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => chyusenDb.deleteChyusenEntry(ctx.user.id, input.id)),

    restore: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => chyusenDb.restoreChyusenEntry(ctx.user.id, input.id)),

    setParticipation: protectedProcedure
      .input(z.object({ id: z.number(), applicationStatus: z.enum(["not_registered", "registered", "cancelled", "won", "lost", "not_participating"]) }))
      .mutation(async ({ ctx, input }) => {
        if (input.applicationStatus === "won") {
          const entry = await chyusenDb.getChyusenEntry(ctx.user.id, input.id);
          if (!entry) throw new Error("Không tìm thấy Chyusen.");
          if (entry.resultDate && !isChyusenResultReady(entry.resultDate)) {
            throw new Error(`Chỉ có thể đánh dấu Đã trúng từ ngày công bố kết quả (${formatChyusenDayMonth(entry.resultDate)}).`);
          }
        }
        const updated = await chyusenDb.updateChyusenEntry(ctx.user.id, input.id, {
          applicationStatus: input.applicationStatus,
          resultStatus: input.applicationStatus === "won" ? "won" : input.applicationStatus === "lost" ? "lost" : "pending",
          resultCheckedAt: input.applicationStatus === "registered" ? null : undefined,
        });
        if (input.applicationStatus === "lost") {
          const trashed = await chyusenDb.deleteChyusenEntry(ctx.user.id, input.id);
          return { ...updated, trashed: true, deletedAt: trashed.deletedAt };
        }
        return updated;
      }),

    markResultChecked: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const entry = await chyusenDb.getChyusenEntry(ctx.user.id, input.id);
        if (!entry) throw new Error("Không tìm thấy Chyusen.");
        if (entry.applicationStatus !== "registered" || entry.resultStatus === "won" || entry.resultStatus === "lost") {
          throw new Error("Chỉ có thể đánh dấu kiểm tra cho Chyusen đang chờ kết quả.");
        }
        if (entry.resultDate && !isChyusenResultReady(entry.resultDate)) {
          throw new Error(`Chỉ có thể kiểm tra kết quả từ ngày công bố (${formatChyusenDayMonth(entry.resultDate)}).`);
        }
        return chyusenDb.updateChyusenEntry(ctx.user.id, input.id, { resultCheckedAt: new Date() });
      }),

    undoWon: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const entry = await chyusenDb.getChyusenEntry(ctx.user.id, input.id);
        if (!entry) throw new Error("Không tìm thấy Chyusen.");
        if (entry.applicationStatus !== "won" && entry.resultStatus !== "won") throw new Error("Chyusen này không ở trạng thái Đã trúng.");
        if (entry.purchaseCreatedAt) throw new Error("Không thể hoàn tác sau khi Chyusen đã được chuyển sang Mua Hàng.");
        return chyusenDb.updateChyusenEntry(ctx.user.id, input.id, { applicationStatus: "registered", resultStatus: "pending", resultCheckedAt: null });
      }),

    purchaseDraft: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const entry = await chyusenDb.getChyusenEntry(ctx.user.id, input.id);
        if (!entry) throw new Error("Không tìm thấy Chyusen.");
        if (entry.applicationStatus !== "won" && entry.resultStatus !== "won") throw new Error("Chỉ Chyusen đã trúng mới có thể chuyển sang Mua Hàng.");
        if (entry.purchaseCreatedAt) throw new Error("Chyusen này đã được chuyển sang Mua Hàng trước đó.");
        return {
          chyusenEntryId: entry.id,
          productName: entry.productName,
          productType: entry.productType === "set" || entry.productType === "other" ? "box" : entry.productType,
          series: entry.series || "Pokemon",
          shop: entry.customShopName || entry.shop || "Khác",
          quantity: 1,
          price: Number(entry.price || 0),
          note: `Nguồn Chyusen: ${entry.sourceUrl || ""}`,
        };
      }),

    markPurchaseCreated: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await chyusenDb.markChyusenPurchaseCreated(ctx.user.id, input.id);
        return chyusenDb.deleteChyusenEntry(ctx.user.id, input.id);
      }),

    notifications: protectedProcedure.query(({ ctx }) => chyusenDb.listChyusenNotifications(ctx.user.id)),

    markNotificationRead: protectedProcedure
      .input(z.object({ id: z.number(), isRead: z.boolean().default(true) }))
      .mutation(({ ctx, input }) => chyusenDb.markChyusenNotificationRead(ctx.user.id, input.id, input.isRead)),

    markAllNotificationsRead: protectedProcedure
      .mutation(({ ctx }) => chyusenDb.markAllChyusenNotificationsRead(ctx.user.id)),

    deleteNotification: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => chyusenDb.deleteChyusenNotification(ctx.user.id, input.id)),

    notificationSettings: protectedProcedure
      .query(({ ctx }) => chyusenDb.getChyusenNotificationSettings(ctx.user.id)),

    updateNotificationSettings: protectedProcedure
      .input(z.object({
        lotteryNew: z.boolean().optional(),
        lotteryExpiring: z.boolean().optional(),
        lotteryResult: z.boolean().optional(),
        lotteryChanged: z.boolean().optional(),
        lotteryWon: z.boolean().optional(),
        lotteryLost: z.boolean().optional(),
        deadlineHours: z.array(z.number().int().min(1).max(336)).max(12).optional(),
        soundNewEnabled: z.boolean().optional(),
        soundUrgentEnabled: z.boolean().optional(),
        quietHoursEnabled: z.boolean().optional(),
        quietStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        quietEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      }))
      .mutation(({ ctx, input }) => chyusenDb.updateChyusenNotificationSettings(ctx.user.id, input)),

    sources: protectedProcedure.query(({ ctx }) => chyusenDb.listChyusenSources(ctx.user.id)),

    sourceHistory: protectedProcedure
      .input(z.object({ sourceId: z.number().optional() }).optional())
      .query(({ ctx, input }) => chyusenDb.listChyusenSourceHistory(ctx.user.id, input?.sourceId)),

    createSource: protectedProcedure
      .input(z.object({ sourceUrl: z.string().trim().url().max(2048), label: z.string().trim().max(255).optional(), checkIntervalMinutes: z.union([z.literal(60), z.literal(180), z.literal(360), z.literal(720), z.literal(1440)]).default(360) }))
      .mutation(({ ctx, input }) => chyusenDb.createChyusenSource(ctx.user.id, { ...input, sourceUrl: validateChyusenSourceUrl(input.sourceUrl) })),

    updateSource: protectedProcedure
      .input(z.object({ id: z.number(), sourceUrl: z.string().trim().url().max(2048).optional(), label: z.string().trim().max(255).nullable().optional(), isActive: z.boolean().optional(), checkIntervalMinutes: z.union([z.literal(60), z.literal(180), z.literal(360), z.literal(720), z.literal(1440)]).optional() }))
      .mutation(({ ctx, input }) => {
        const { id, sourceUrl, ...data } = input;
        return chyusenDb.updateChyusenSource(ctx.user.id, id, { ...data, sourceUrl: sourceUrl ? validateChyusenSourceUrl(sourceUrl) : undefined });
      }),

    deleteSource: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => chyusenDb.deleteChyusenSource(ctx.user.id, input.id)),

    checkSourceNow: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => checkChyusenSourceNow(ctx.user.id, input.id)),
  }),

  dashboard: router({
    stats: protectedProcedure
      .query(({ ctx }) => db.getDashboardStats(ctx.user.id)),
  }),

  reports: router({
    overview: protectedProcedure
      .query(({ ctx }) => db.getReportsOverview(ctx.user.id)),
    monthly: protectedProcedure
      .input(z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) }))
      .query(async ({ ctx, input }) => createMonthlyReport(input.month, await db.listPurchases(ctx.user.id), await db.listSales(ctx.user.id))),
  }),

  shops: router({
    list: protectedProcedure
      .query(({ ctx }) => db.listShops(ctx.user.id)),
    recent: protectedProcedure.query(({ ctx }) => db.listRecentPurchaseShops(ctx.user.id)),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        location: z.string().optional(),
        note: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => db.createShop({
        userId: ctx.user.id,
        name: input.name,
        location: input.location,
        note: input.note,
      })),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().trim().min(1).max(120) })).mutation(({ ctx, input }) => db.updateShop(ctx.user.id, input.id, input.name)),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => db.deleteShop(ctx.user.id, input.id)),
    setPinned: protectedProcedure.input(z.object({ id: z.number().int().positive(), isPinned: z.boolean() })).mutation(({ ctx, input }) => db.setShopPinned(ctx.user.id, input.id, input.isPinned)),
  }),

  saleLocations: router({
    list: protectedProcedure.query(({ ctx }) => db.listSaleLocations(ctx.user.id)),
    recent: protectedProcedure.query(({ ctx }) => db.listRecentSaleLocations(ctx.user.id)),
    create: protectedProcedure.input(z.object({ name: z.string().trim().min(1).max(120) })).mutation(({ ctx, input }) => db.createSaleLocation(ctx.user.id, input.name)),
    update: protectedProcedure.input(z.object({ id: z.number(), name: z.string().trim().min(1).max(120) })).mutation(({ ctx, input }) => db.updateSaleLocation(ctx.user.id, input.id, input.name)),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => db.deleteSaleLocation(ctx.user.id, input.id)),
    setPinned: protectedProcedure.input(z.object({ id: z.number().int().positive(), isPinned: z.boolean() })).mutation(({ ctx, input }) => db.setSaleLocationPinned(ctx.user.id, input.id, input.isPinned)),
  }),
});

export type AppRouter = typeof appRouter;
