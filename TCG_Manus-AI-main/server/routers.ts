import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";
import { extractAssistantText } from "./aiResponse";
import { buildTcgAssistantSystemPrompt } from "./tcgAssistantPrompt";
import * as chyusenDb from "./chyusenDb";
import { parseChyusenUrl } from "./chyusenSource";
import { validatePublicChyusenUrl } from "./chyusenUtils";
import { checkChyusenSourceNow } from "./chyusenMonitor";
import { analyzeChyusenImage } from "./chyusenImageAnalysis";

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
  sourceContentHash: z.string().trim().max(64).optional(),
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
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
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
      .query(({ input }) => db.getProductById(input.id)),

    suggestions: protectedProcedure
      .input(z.object({ search: z.string() }))
      .query(({ ctx, input }) => db.getProductSuggestions(ctx.user.id, input.search)),

    inStock: protectedProcedure
      .query(({ ctx }) => db.getInStockProducts(ctx.user.id)),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        type: z.enum(["card", "box", "pack"]),
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
        condition: input.condition || "New",
        psaGrade: input.psaGrade,
        releaseDate: input.releaseDate,
        image: input.image,
        status: "in_stock",
      })),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
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

    syncSnkrdunkPrice: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => db.syncSnkrdunkPriceForProduct(input.id, ctx.user.id)),

    syncAllSnkrdunk: protectedProcedure
      .mutation(({ ctx }) => db.syncAllSnkrdunkPrices(ctx.user.id)),

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

  purchases: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().optional() }).optional())
      .query(({ ctx, input }) => db.listPurchases(ctx.user.id, input)),

    create: protectedProcedure
      .input(z.object({
        productName: z.string().min(1),
        productType: z.string().default("card"),
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

  activities: router({
    list: protectedProcedure
      .input(z.object({
        entityType: z.enum(["product", "purchase", "sale", "shop"]).optional(),
        action: z.string().trim().min(1).max(100).optional(),
        syncScope: z.enum(["only", "exclude"]).optional(),
        search: z.string().trim().max(100).optional(),
        limit: z.number().int().min(10).max(100).default(25),
        cursor: z.object({ id: z.number().int().positive(), createdAt: z.date() }).optional(),
      }).optional())
      .query(({ ctx, input }) => db.listActivityLogs(ctx.user.id, input)),
  }),

  chyusen: router({
    list: protectedProcedure.query(({ ctx }) => chyusenDb.listChyusenEntries(ctx.user.id)),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ ctx, input }) => chyusenDb.getChyusenEntry(ctx.user.id, input.id)),

    previewUrl: protectedProcedure
      .input(z.object({ sourceUrl: z.string().trim().url().max(2048) }))
      .mutation(({ input }) => parseChyusenUrl(validateChyusenSourceUrl(input.sourceUrl), true)),

    analyzeImage: protectedProcedure
      .input(z.object({ imageDataUrl: z.string().trim().min(64).max(7_000_000) }))
      .mutation(({ input }) => analyzeChyusenImage(input.imageDataUrl)),

    refreshPreview: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const entry = await chyusenDb.getChyusenEntry(ctx.user.id, input.id);
        if (!entry?.sourceUrl) throw new Error("Không tìm thấy URL gốc của Chyusen này.");
        return parseChyusenUrl(validateChyusenSourceUrl(entry.sourceUrl), true);
      }),

    create: protectedProcedure
      .input(chyusenEntryInput)
      .mutation(({ ctx, input }) => chyusenDb.createChyusenEntry(ctx.user.id, {
        ...input,
        sourceUrl: input.sourceUrl ? validateChyusenSourceUrl(input.sourceUrl) : undefined,
        imageUrl: input.imageUrl || undefined,
      })),

    update: protectedProcedure
      .input(z.object({ id: z.number(), data: chyusenEntryBase.partial() }))
      .mutation(({ ctx, input }) => chyusenDb.updateChyusenEntry(ctx.user.id, input.id, {
        ...input.data,
        sourceUrl: input.data.sourceUrl ? validateChyusenSourceUrl(input.data.sourceUrl) : undefined,
        imageUrl: input.data.imageUrl || undefined,
      })),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => chyusenDb.deleteChyusenEntry(ctx.user.id, input.id)),

    restore: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => chyusenDb.restoreChyusenEntry(ctx.user.id, input.id)),

    setParticipation: protectedProcedure
      .input(z.object({ id: z.number(), applicationStatus: z.enum(["not_registered", "registered", "cancelled", "won", "lost", "not_participating"]) }))
      .mutation(({ ctx, input }) => chyusenDb.updateChyusenEntry(ctx.user.id, input.id, {
        applicationStatus: input.applicationStatus,
        resultStatus: input.applicationStatus === "won" ? "won" : input.applicationStatus === "lost" ? "lost" : undefined,
      })),

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
      .mutation(({ ctx, input }) => chyusenDb.markChyusenPurchaseCreated(ctx.user.id, input.id)),

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
  }),

  shops: router({
    list: protectedProcedure
      .query(({ ctx }) => db.listShops(ctx.user.id)),

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
  }),
});

export type AppRouter = typeof appRouter;
