import { getDashboardStats, getInStockProducts, listProducts, listSales, listPurchases } from "./db";
import { listChyusenEntries } from "./chyusenDb";
import { extractAssistantText } from "./aiResponse";
import { TCG_ASSISTANT_SYSTEM_PROMPT } from "./tcgAssistantPrompt";

/**
 * Trợ lý AI cho TCG Manager — cùng cách làm với Bot-RAPTOR:
 * server tự tổng hợp số liệu thật của người dùng thành ngữ cảnh,
 * mô hình (Gemini qua endpoint tương thích OpenAI) chỉ diễn đạt lại.
 * Khóa API chỉ nằm ở biến môi trường AI_API_KEY của server, không qua client.
 * AI chỉ đọc và trả lời — không có đường nào sửa dữ liệu từ đây.
 */

export const AI_CHAT_DEFAULT_MODEL = "gemini-3.5-flash-lite";
export const AI_CHAT_DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";
export const AI_CHAT_COOLDOWN_MS = 3000;
export const AI_CHAT_TIMEOUT_MS = 45000;
export const AI_CHAT_NOT_CONFIGURED_MESSAGE =
  "Trợ lý AI chưa được cấu hình khóa API. Quản trị viên cần đặt biến AI_API_KEY trong phần Environment của app trên Botkeep rồi khởi động lại app — sau đó quay lại hỏi mình nhé.";

export interface AiChatConfig {
  configured: boolean;
  model: string;
  baseUrl: string;
}

export function getAiChatConfig(env: NodeJS.ProcessEnv = process.env): AiChatConfig {
  const apiKey = (env.AI_API_KEY || "").trim();
  return {
    configured: apiKey.length > 0,
    model: (env.AI_MODEL || "").trim() || AI_CHAT_DEFAULT_MODEL,
    baseUrl: ((env.AI_BASE_URL || "").trim() || AI_CHAT_DEFAULT_BASE_URL).replace(/\/+$/, ""),
  };
}

export function getAiChatStatus(): { configured: boolean; model: string } {
  const config = getAiChatConfig();
  return { configured: config.configured, model: config.model };
}

export interface AiChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function sanitizeAiChatHistory(messages: AiChatMessage[]): AiChatMessage[] {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0,
    )
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, 2000) }));
}

const lastCallByUser = new Map<number, number>();

export function aiChatCooldownRemainingMs(userId: number, now: number = Date.now()): number {
  const last = lastCallByUser.get(userId);
  if (!last) return 0;
  return Math.max(0, AI_CHAT_COOLDOWN_MS - (now - last));
}

// ---------- Định dạng số liệu ----------

const yenGrouping = new Intl.NumberFormat("en-US");
export function formatYen(value: number): string {
  return `¥${yenGrouping.format(Math.round(Number(value) || 0))}`;
}

const jstDateFmt = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Tokyo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const jstDateTimeFmt = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Tokyo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const jstYearMonthFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
});

export function formatJstDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : jstDateFmt.format(d);
}

// ---------- Ảnh chụp kinh doanh ----------

export interface AiProductLine {
  name: string;
  type: string;
  quantity: number;
  buyPrice: number;
  marketPrice: number;
  unrealized: number;
  roiPct: number | null;
}

export interface AiBusinessSnapshot {
  generatedAt: string;
  totalCapital: number;
  currentValue: number;
  totalProfit: number;
  monthProfit: number;
  monthRevenue: number;
  totalInStockUnits: number;
  productKinds: number;
  totalSoldUnits: number;
  topGainers: AiProductLine[];
  topLosers: AiProductLine[];
  biggestHoldings: AiProductLine[];
  unpricedCount: number;
  recentSales: { name: string; quantity: number; revenue: number; profit: number; date: string }[];
  recentPurchases: { name: string; quantity: number; total: number; shop: string | null; date: string }[];
  chyusen: {
    total: number;
    registered: number;
    won: number;
    lost: number;
    pendingResults: number;
    upcomingDeadlines: { title: string; shop: string; date: string }[];
    upcomingResults: { title: string; shop: string; date: string }[];
    wonAwaitingPurchase: { title: string; shop: string; date: string }[];
  };
}

function toProductLine(p: any): AiProductLine {
  const buyPrice = Number(p.buyPrice || 0);
  const marketPrice = Number(p.marketPrice || 0);
  const qty = Math.max(0, (p.quantity || 0) - (p.damagedQuantity || 0));
  return {
    name: String(p.name || "Sản phẩm"),
    type: String(p.type || ""),
    quantity: qty,
    buyPrice,
    marketPrice,
    unrealized: (marketPrice - buyPrice) * qty,
    roiPct: buyPrice > 0 && marketPrice > 0 ? ((marketPrice - buyPrice) / buyPrice) * 100 : null,
  };
}

export async function buildAiBusinessSnapshot(userId: number, now: Date = new Date()): Promise<AiBusinessSnapshot> {
  const [stats, inStock, allProducts, sales, purchases, chyusenEntries] = await Promise.all([
    getDashboardStats(userId),
    getInStockProducts(userId),
    listProducts(userId),
    listSales(userId),
    listPurchases(userId),
    listChyusenEntries(userId),
  ]);

  const nameById = new Map<number, string>();
  for (const p of allProducts as any[]) nameById.set(p.id, String(p.name || `Sản phẩm #${p.id}`));

  const lines = (inStock as any[]).map(toProductLine);
  const priced = lines.filter((l) => l.marketPrice > 0 && l.quantity > 0);
  const topGainers = [...priced].sort((a, b) => b.unrealized - a.unrealized).filter((l) => l.unrealized > 0).slice(0, 5);
  const topLosers = [...priced].sort((a, b) => a.unrealized - b.unrealized).filter((l) => l.unrealized < 0).slice(0, 5);
  const biggestHoldings = [...lines]
    .sort((a, b) => b.buyPrice * b.quantity - a.buyPrice * a.quantity)
    .filter((l) => l.quantity > 0)
    .slice(0, 5);

  const currentYearMonth = jstYearMonthFmt.format(now);
  let monthProfit = 0;
  let monthRevenue = 0;
  for (const s of sales as any[]) {
    const d = s.saleDate ? new Date(s.saleDate) : null;
    if (d && !Number.isNaN(d.getTime()) && jstYearMonthFmt.format(d) === currentYearMonth) {
      monthProfit += Number(s.profit || 0);
      monthRevenue += Number(s.totalRevenue || 0);
    }
  }

  const byDateDesc = (key: string) => (a: any, b: any) =>
    new Date(b[key] || 0).getTime() - new Date(a[key] || 0).getTime();
  const recentSales = [...(sales as any[])].sort(byDateDesc("saleDate")).slice(0, 6).map((s) => ({
    name: nameById.get(s.productId) || `Sản phẩm #${s.productId}`,
    quantity: s.quantity || 0,
    revenue: Number(s.totalRevenue || 0),
    profit: Number(s.profit || 0),
    date: formatJstDate(s.saleDate),
  }));
  const recentPurchases = [...(purchases as any[])]
    .filter((p) => p.status !== "cancelled")
    .sort(byDateDesc("purchaseDate"))
    .slice(0, 6)
    .map((p) => ({
      name: nameById.get(p.productId) || `Sản phẩm #${p.productId}`,
      quantity: p.quantity || 0,
      total: Number(p.totalPrice || 0),
      shop: p.shop || null,
      date: formatJstDate(p.purchaseDate),
    }));

  const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const asDate = (v: any) => (v ? new Date(v) : null);
  const shopOf = (e: any) => String(e.customShopName || e.shop || "—");
  const upcomingDeadlines: AiBusinessSnapshot["chyusen"]["upcomingDeadlines"] = [];
  const upcomingResults: AiBusinessSnapshot["chyusen"]["upcomingResults"] = [];
  const wonAwaitingPurchase: AiBusinessSnapshot["chyusen"]["wonAwaitingPurchase"] = [];
  let registered = 0;
  let won = 0;
  let lost = 0;
  let pendingResults = 0;
  for (const e of chyusenEntries as any[]) {
    if (e.applicationStatus === "registered") registered += 1;
    if (e.applicationStatus === "won" || e.resultStatus === "won") won += 1;
    if (e.applicationStatus === "lost" || e.resultStatus === "lost") lost += 1;
    if (e.resultStatus === "pending") pendingResults += 1;
    const end = asDate(e.applicationEnd);
    if (
      end &&
      end >= now &&
      end <= in14Days &&
      (e.applicationStatus === "registered" || e.applicationStatus === "not_registered")
    ) {
      upcomingDeadlines.push({ title: String(e.title || e.productName || "Chyusen"), shop: shopOf(e), date: formatJstDate(end), _t: end.getTime() } as any);
    }
    const result = asDate(e.resultDate);
    if (result && result >= now && result <= in14Days && e.resultStatus === "pending") {
      upcomingResults.push({ title: String(e.title || e.productName || "Chyusen"), shop: shopOf(e), date: formatJstDate(result), _t: result.getTime() } as any);
    }
    const pickup = asDate(e.pickupEnd);
    if ((e.applicationStatus === "won" || e.resultStatus === "won") && pickup && pickup >= now) {
      wonAwaitingPurchase.push({ title: String(e.title || e.productName || "Chyusen"), shop: shopOf(e), date: formatJstDate(pickup), _t: pickup.getTime() } as any);
    }
  }
  const sortStrip = (arr: any[]) =>
    arr
      .sort((a, b) => (a._t || 0) - (b._t || 0))
      .slice(0, 6)
      .map(({ _t, ...rest }) => rest);

  return {
    generatedAt: jstDateTimeFmt.format(now),
    totalCapital: Number((stats as any).totalCapital || 0),
    currentValue: Number((stats as any).currentValue || 0),
    totalProfit: Number((stats as any).totalProfit || 0),
    monthProfit,
    monthRevenue,
    totalInStockUnits: Number((stats as any).totalInStock || 0),
    productKinds: (allProducts as any[]).length,
    totalSoldUnits: Number((stats as any).totalSold || 0),
    topGainers,
    topLosers,
    biggestHoldings,
    unpricedCount: lines.filter((l) => l.marketPrice <= 0 && l.quantity > 0).length,
    recentSales,
    recentPurchases,
    chyusen: {
      total: (chyusenEntries as any[]).length,
      registered,
      won,
      lost,
      pendingResults,
      upcomingDeadlines: sortStrip(upcomingDeadlines),
      upcomingResults: sortStrip(upcomingResults),
      wonAwaitingPurchase: sortStrip(wonAwaitingPurchase),
    },
  };
}

// ---------- Ngữ cảnh dạng chữ cho mô hình ----------

function productLineText(l: AiProductLine): string {
  const roi = l.roiPct === null ? "chưa rõ ROI" : `ROI ${l.roiPct.toFixed(1)}%`;
  return `- ${l.name} (${l.type}, còn ${l.quantity}): mua ${formatYen(l.buyPrice)}, thị trường ${formatYen(l.marketPrice)}, lãi chưa thực hiện ${formatYen(l.unrealized)} (${roi})`;
}

export function formatAiBusinessContext(s: AiBusinessSnapshot): string {
  const out: string[] = [];
  out.push(`Thời điểm lấy số liệu: ${s.generatedAt} (giờ Nhật).`);
  out.push("TỔNG QUAN:");
  out.push(`- Tổng vốn đang nằm trong kho: ${formatYen(s.totalCapital)}`);
  out.push(`- Giá trị kho theo giá thị trường hiện tại: ${formatYen(s.currentValue)}`);
  out.push(`- Tổng lợi nhuận đã thực hiện (từ trước tới nay): ${formatYen(s.totalProfit)}`);
  out.push(`- Lợi nhuận tháng này: ${formatYen(s.monthProfit)} trên doanh thu ${formatYen(s.monthRevenue)}`);
  out.push(`- Tồn kho: ${s.totalInStockUnits} đơn vị thuộc ${s.productKinds} sản phẩm; đã bán tổng cộng ${s.totalSoldUnits} đơn vị.`);
  if (s.unpricedCount > 0) out.push(`- Có ${s.unpricedCount} sản phẩm trong kho chưa có giá thị trường (chưa đồng bộ SNKRDUNK).`);

  out.push("TOP SẢN PHẨM LÃI CHƯA THỰC HIỆN CAO NHẤT:");
  out.push(s.topGainers.length ? s.topGainers.map(productLineText).join("\n") : "- Không có dữ liệu.");
  out.push("SẢN PHẨM ĐANG LỖ SO VỚI GIÁ MUA:");
  out.push(s.topLosers.length ? s.topLosers.map(productLineText).join("\n") : "- Không có sản phẩm nào đang lỗ.");
  out.push("SẢN PHẨM CHIẾM VỐN NHIỀU NHẤT:");
  out.push(
    s.biggestHoldings.length
      ? s.biggestHoldings.map((l) => `- ${l.name} (${l.type}, còn ${l.quantity}): vốn ${formatYen(l.buyPrice * l.quantity)}`).join("\n")
      : "- Không có dữ liệu.",
  );

  out.push("BÁN GẦN ĐÂY:");
  out.push(
    s.recentSales.length
      ? s.recentSales.map((x) => `- ${x.date}: bán ${x.quantity} × ${x.name}, doanh thu ${formatYen(x.revenue)}, lãi ${formatYen(x.profit)}`).join("\n")
      : "- Chưa có giao dịch bán nào.",
  );
  out.push("MUA GẦN ĐÂY:");
  out.push(
    s.recentPurchases.length
      ? s.recentPurchases.map((x) => `- ${x.date}: mua ${x.quantity} × ${x.name}, tổng ${formatYen(x.total)}${x.shop ? ` tại ${x.shop}` : ""}`).join("\n")
      : "- Chưa có giao dịch mua nào.",
  );

  out.push("CHYUSEN (bốc thăm mua hàng):");
  out.push(
    `- Tổng ${s.chyusen.total} đợt: đã đăng ký ${s.chyusen.registered}, đã trúng ${s.chyusen.won}, đã trượt ${s.chyusen.lost}, đang chờ kết quả ${s.chyusen.pendingResults}.`,
  );
  out.push("Sắp hết hạn đăng ký (14 ngày tới):");
  out.push(
    s.chyusen.upcomingDeadlines.length
      ? s.chyusen.upcomingDeadlines.map((x) => `- ${x.title} — ${x.shop}: hết hạn ${x.date}`).join("\n")
      : "- Không có đợt nào sắp hết hạn đăng ký.",
  );
  out.push("Sắp công bố kết quả (14 ngày tới):");
  out.push(
    s.chyusen.upcomingResults.length
      ? s.chyusen.upcomingResults.map((x) => `- ${x.title} — ${x.shop}: công bố ${x.date}`).join("\n")
      : "- Không có đợt nào sắp công bố kết quả.",
  );
  out.push("Đã trúng, còn hạn mua hàng:");
  out.push(
    s.chyusen.wonAwaitingPurchase.length
      ? s.chyusen.wonAwaitingPurchase.map((x) => `- ${x.title} — ${x.shop}: hạn mua tới ${x.date}`).join("\n")
      : "- Không có đợt đã trúng nào đang chờ mua.",
  );
  return out.join("\n");
}

export function buildAiChatSystemPrompt(contextText: string): string {
  return `${TCG_ASSISTANT_SYSTEM_PROMPT}

MỞ RỘNG PHẠM VI: Ngoài Card, ngữ cảnh bên dưới còn gồm Box/Pack, lịch sử mua bán và Chyusen (bốc thăm mua hàng). Khi người dùng hỏi việc sắp tới cần làm, hãy ưu tiên nhắc các hạn đăng ký Chyusen, ngày công bố kết quả và đặc biệt là hạn mua hàng của các đợt đã trúng. Mọi số liệu chỉ lấy từ ngữ cảnh; phần nào ngữ cảnh ghi không có dữ liệu thì nói rõ là chưa có dữ liệu, không suy đoán.

NGỮ CẢNH KINH DOANH HIỆN TẠI:
${contextText}`;
}

// ---------- Gọi mô hình ----------

export async function askAiChat(userId: number, messages: AiChatMessage[]): Promise<string> {
  const config = getAiChatConfig();
  if (!config.configured) return AI_CHAT_NOT_CONFIGURED_MESSAGE;

  if (aiChatCooldownRemainingMs(userId) > 0) {
    return "Bạn hỏi hơi nhanh — chờ vài giây rồi hỏi tiếp nhé.";
  }
  lastCallByUser.set(userId, Date.now());

  const history = sanitizeAiChatHistory(messages);
  if (history.length === 0) return "Bạn cứ nhập câu hỏi, mình trả lời dựa trên số liệu thật trong TCG Manager của bạn.";

  let contextText: string;
  try {
    const snapshot = await buildAiBusinessSnapshot(userId);
    contextText = formatAiBusinessContext(snapshot);
  } catch (error) {
    console.error("AI chat context error:", error);
    return "Xin lỗi, mình chưa đọc được số liệu mới nhất từ hệ thống. Vui lòng thử lại sau ít phút.";
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_CHAT_TIMEOUT_MS);
  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${(process.env.AI_API_KEY || "").trim()}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.3,
        max_tokens: 1200,
        messages: [
          { role: "system", content: buildAiChatSystemPrompt(contextText) },
          ...history.map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    });
    if (!response.ok) {
      console.error(`AI chat upstream error: HTTP ${response.status} (model=${config.model})`);
      if (response.status === 429) {
        return "AI đang quá tải hoặc đã hết lượt miễn phí trong lúc này. Chờ ít phút rồi hỏi lại nhé.";
      }
      return "Xin lỗi, dịch vụ AI đang gặp sự cố tạm thời. Vui lòng thử lại sau ít phút.";
    }
    const json = await response.json();
    const text = extractAssistantText(json as any);
    return text || "Xin lỗi, AI không trả về nội dung hiển thị được. Vui lòng thử hỏi lại.";
  } catch (error) {
    console.error("AI chat request error:", error);
    return "Xin lỗi, kết nối tới dịch vụ AI đang gặp sự cố. Vui lòng thử lại sau ít phút.";
  } finally {
    clearTimeout(timer);
  }
}
