import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  AI_CHAT_DEFAULT_MODEL,
  AI_CHAT_NOT_CONFIGURED_MESSAGE,
  buildAiChatSystemPrompt,
  formatAiBusinessContext,
  formatYen,
  getAiChatConfig,
  sanitizeAiChatHistory,
  type AiBusinessSnapshot,
} from "./aiChat";

function readProjectFile(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const fixture: AiBusinessSnapshot = {
  generatedAt: "18/11/2026 03:30",
  totalCapital: 4286500,
  currentValue: 5120000,
  totalProfit: 612340,
  monthProfit: 84500,
  monthRevenue: 320000,
  totalInStockUnits: 128,
  productKinds: 42,
  totalSoldUnits: 57,
  topGainers: [
    { name: "OP-18 BOX", type: "box", quantity: 2, buyPrice: 6420, marketPrice: 9980, unrealized: 7120, roiPct: 55.4 },
  ],
  topLosers: [
    { name: "Pack lẻ X", type: "pack", quantity: 10, buyPrice: 800, marketPrice: 620, unrealized: -1800, roiPct: -22.5 },
  ],
  biggestHoldings: [
    { name: "OP-18 BOX", type: "box", quantity: 2, buyPrice: 6420, marketPrice: 9980, unrealized: 7120, roiPct: 55.4 },
  ],
  unpricedCount: 3,
  recentSales: [{ name: "OP-18 BOX", quantity: 1, revenue: 9980, profit: 3560, date: "15/11/2026" }],
  recentPurchases: [{ name: "MEGA BOX", quantity: 1, total: 6000, shop: "COMG! Nagaoka", date: "07/11/2026" }],
  chyusen: {
    total: 12,
    registered: 5,
    won: 2,
    lost: 3,
    pendingResults: 4,
    upcomingDeadlines: [{ title: "Chó Xanh Mới", shop: "FamilyMart", date: "20/11/2026" }],
    upcomingResults: [{ title: "OP-18 GEO", shop: "GEO", date: "25/11/2026" }],
    wonAwaitingPurchase: [{ title: "Hadou BOX", shop: "Pokémon Center", date: "24/11/2026" }],
  },
};

describe("aiChat config (env-driven, RAPTOR pattern)", () => {
  it("reports not configured without AI_API_KEY and defaults to the Gemini flash-lite model", () => {
    const config = getAiChatConfig({});
    expect(config.configured).toBe(false);
    expect(config.model).toBe(AI_CHAT_DEFAULT_MODEL);
    expect(config.baseUrl).toContain("generativelanguage.googleapis.com");
  });

  it("honours AI_MODEL / AI_BASE_URL overrides and trims trailing slashes", () => {
    const config = getAiChatConfig({
      AI_API_KEY: "test-key",
      AI_MODEL: "gemini-test",
      AI_BASE_URL: "https://example.com/v1/",
    });
    expect(config.configured).toBe(true);
    expect(config.model).toBe("gemini-test");
    expect(config.baseUrl).toBe("https://example.com/v1");
  });

  it("has a friendly not-configured message that names the env var, never a key value", () => {
    expect(AI_CHAT_NOT_CONFIGURED_MESSAGE).toContain("AI_API_KEY");
    expect(AI_CHAT_NOT_CONFIGURED_MESSAGE).toContain("Botkeep");
  });
});

describe("aiChat history sanitising", () => {
  it("keeps only user/assistant turns, trims, caps at 12 and 2000 chars", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: `  tin ${i}  `,
    }));
    const clean = sanitizeAiChatHistory(many);
    expect(clean.length).toBe(12);
    expect(clean[0].content).toBe("tin 8");
    const dirty = sanitizeAiChatHistory([
      { role: "system", content: "hack" } as any,
      { role: "user", content: "   " },
      { role: "user", content: "x".repeat(2500) },
    ]);
    expect(dirty.length).toBe(1);
    expect(dirty[0].content.length).toBe(2000);
  });
});

describe("aiChat business context formatting", () => {
  it("formats yen with the ¥ symbol and comma grouping", () => {
    expect(formatYen(4286500)).toBe("¥4,286,500");
    expect(formatYen(-1800)).toBe("¥-1,800");
  });

  it("includes the headline figures, top movers and every chyusen deadline group", () => {
    const text = formatAiBusinessContext(fixture);
    expect(text).toContain("¥4,286,500");
    expect(text).toContain("¥84,500");
    expect(text).toContain("OP-18 BOX");
    expect(text).toContain("Pack lẻ X");
    expect(text).toContain("Chó Xanh Mới");
    expect(text).toContain("Hadou BOX");
    expect(text).toContain("hạn mua tới 24/11/2026");
    expect(text).toContain("chưa có giá thị trường");
  });

  it("states empty groups explicitly so the model cannot invent entries", () => {
    const empty: AiBusinessSnapshot = {
      ...fixture,
      topGainers: [],
      topLosers: [],
      biggestHoldings: [],
      recentSales: [],
      recentPurchases: [],
      chyusen: { ...fixture.chyusen, upcomingDeadlines: [], upcomingResults: [], wonAwaitingPurchase: [] },
    };
    const text = formatAiBusinessContext(empty);
    expect(text).toContain("Không có sản phẩm nào đang lỗ.");
    expect(text).toContain("Không có đợt đã trúng nào đang chờ mua.");
    expect(text).toContain("Chưa có giao dịch bán nào.");
  });

  it("system prompt keeps the base safety rules and adds the wider business scope", () => {
    const prompt = buildAiChatSystemPrompt("NGỮ CẢNH MẪU");
    expect(prompt).toContain("Không tự tạo giá");
    expect(prompt).toContain("Chyusen");
    expect(prompt).toContain("NGỮ CẢNH MẪU");
    expect(prompt).toContain("hạn mua hàng của các đợt đã trúng");
  });
});

describe("aiChat wiring (source assertions)", () => {
  it("router delegates chat to askAiChat and exposes a status query", () => {
    const routers = readProjectFile("server/routers.ts");
    expect(routers).toContain("askAiChat(ctx.user.id, input.messages)");
    expect(routers).toContain("getAiChatStatus()");
    expect(routers).not.toContain("claude-haiku-4-5");
  });

  it("assistant is mounted in the layout sidebar and respects the settings toggle", () => {
    const layout = readProjectFile("client/src/components/DashboardLayout.tsx");
    expect(layout).toContain("<SidebarAIAssistant />");
    const assistant = readProjectFile("client/src/components/SidebarAIAssistant.tsx");
    expect(assistant).toContain("getAiChatEnabled");
    expect(assistant).toContain("trpc.ai.chat.useMutation");
  });

  it("settings page has the Trợ lý AI section with connection status", () => {
    const settings = readProjectFile("client/src/pages/Settings.tsx");
    expect(settings).toContain("Trợ lý AI");
    expect(settings).toContain("trpc.ai.status.useQuery()");
    expect(settings).toContain("setAiChatEnabled");
  });
});
