import { Bot, Loader2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect, useMemo } from "react";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { normalizeAiCurrencyToYen } from "@shared/aiCurrency";
import { AI_CHAT_SETTINGS_EVENT, getAiChatEnabled } from "@/lib/aiChatSettings";

const STORAGE_KEY = "tcg-manager-ai-assistant-history";

export function SidebarAIAssistant() {
  const [enabled, setEnabled] = useState<boolean>(() => getAiChatEnabled());

  useEffect(() => {
    const sync = () => setEnabled(getAiChatEnabled());
    window.addEventListener(AI_CHAT_SETTINGS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(AI_CHAT_SETTINGS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  const { data: analysisContext } = trpc.ai.analysisChartData.useQuery(undefined, { enabled: open });

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as Message[];
      if (Array.isArray(parsed)) setMessages(parsed.filter((item) => item?.role !== "system" && typeof item?.content === "string").slice(-12).map((item) => ({ ...item, content: item.role === "assistant" ? normalizeAiCurrencyToYen(item.content) : item.content })));
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-12)));
  }, [messages]);

  const dynamicPrompts = useMemo(() => {
    const topCards = analysisContext?.topCardsAnalysis || [];
    if (topCards.length === 0) {
      return [
        "💰 Tháng này lãi bao nhiêu?",
        "🎟️ Sắp tới có Chyusen nào cần xử lý không?",
        "📦 Sản phẩm nào đang chiếm vốn nhiều nhất?",
        "📉 Sản phẩm nào trong kho đang lỗ?",
      ];
    }

    const bestCard = topCards[0];
    const cardCount = analysisContext?.inventorySummary?.totalCardsInStock || topCards.length;

    const prompts = [
      "💰 Tháng này lãi bao nhiêu?",
      "🎟️ Sắp tới có Chyusen nào cần xử lý không?",
      `📈 Phân tích xu hướng giá và lợi nhuận cho thẻ "${bestCard.name}"`,
      `⭐ Thẻ bài nào trong ${cardCount} thẻ đang có tỷ suất ROI cao nhất?`,
    ];

    if (topCards.length > 1) {
      const secondCard = topCards[1];
      prompts.push(`🔍 So sánh tiềm năng sinh lời giữa "${bestCard.name}" và "${secondCard.name}"`);
    } else {
      prompts.push(`🔍 Đánh giá toàn diện danh mục Card trong kho`);
    }

    return prompts;
  }, [analysisContext]);

  const assistantMutation = trpc.ai.chat.useMutation({
    onSuccess: (answer: string) => setMessages((current): Message[] => [...current, { role: "assistant" as const, content: normalizeAiCurrencyToYen(answer) }].slice(-12)),
    onError: (error: any) => {
      toast.error("Trợ lý AI chưa thể trả lời", { description: error.message });
      setMessages((current): Message[] => [...current, { role: "assistant" as const, content: "Xin lỗi, hiện tại Trợ lý AI đang bận hoặc gặp sự cố kết nối tạm thời. Vui lòng thử lại câu hỏi sau ít phút." }].slice(-12));
    },
  });

  const placeholder = useMemo(() => "Hỏi về lãi tháng này, sản phẩm đang lỗ, hạn Chyusen...", []);

  const handleSendMessage = (content: string) => {
    const nextMessages: Message[] = [...messages, { role: "user" as const, content }].slice(-12);
    setMessages(nextMessages);
    assistantMutation.mutate({
      messages: nextMessages.map(({ role, content: text }) => ({ role: role === "assistant" ? "assistant" as const : "user" as const, content: text })),
    });
  };

  const clearHistory = () => {
    setMessages([]);
    sessionStorage.removeItem(STORAGE_KEY);
    toast.success("Đã xóa lịch sử trò chuyện của phiên này.");
  };

  if (!enabled) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="mb-3 h-auto w-full justify-start gap-3 border-primary/40 bg-primary/10 px-3 py-2.5 text-left hover:border-primary hover:bg-primary/20 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2 shadow-sm"
          aria-label="Mở Trợ lý AI"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/25 text-primary">
            <Sparkles className="size-4" />
          </span>
          <span className="min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="block text-sm font-bold tracking-wide">Trợ lý AI</span>
            <span className="mt-0.5 block truncate text-[11px] font-medium text-muted-foreground">Hỏi đáp kho, lãi & Chyusen</span>
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none flex-col gap-0 overflow-hidden border-primary/25 p-0 sm:h-[min(82vh,680px)] sm:max-h-[90vh] sm:max-w-2xl sm:gap-4 sm:rounded-2xl">
        <DialogHeader className="shrink-0 border-b border-border bg-primary/5 px-4 py-3 text-left sm:px-5 sm:py-4">
          <div className="flex items-start justify-between gap-2 sm:items-center sm:gap-3">
            <DialogTitle className="min-w-0 flex items-center gap-2 text-base leading-tight sm:text-lg">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-primary"><Bot className="size-4" /></span>
              Trợ lý AI TCG Manager
            </DialogTitle>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Xóa lịch sử trò chuyện" disabled={messages.length === 0 || assistantMutation.isPending} className="size-9 shrink-0 text-muted-foreground hover:text-destructive sm:w-auto sm:px-3">
                  <Trash2 className="size-3.5" />
                  <span className="hidden sm:inline">Xóa lịch sử</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Xóa lịch sử trò chuyện?</AlertDialogTitle>
                  <AlertDialogDescription>Lịch sử chat của phiên hiện tại sẽ bị xóa khỏi thiết bị này. Dữ liệu kho, mua bán và thống kê sẽ không bị ảnh hưởng.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction onClick={clearHistory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Xóa lịch sử</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <DialogDescription className="mt-2 text-xs leading-5 sm:text-sm">
            Hỏi đáp và phân tích dựa trên dữ liệu thật của bạn: kho hàng, mua bán, lợi nhuận và các đợt Chyusen sắp tới hạn. AI chỉ đọc số liệu để trả lời, không sửa dữ liệu.
          </DialogDescription>
        </DialogHeader>

        <div className="relative flex min-h-0 flex-1 overflow-hidden px-3 pb-3 sm:px-5 sm:pb-4">
          <AIChatBox
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={assistantMutation.isPending}
            placeholder={placeholder}
            height="100%"
            emptyStateMessage="Tôi trả lời dựa trên dữ liệu thật trong TCG Manager của bạn: vốn, lãi, tồn kho, giao dịch gần đây và Chyusen."
            suggestedPrompts={dynamicPrompts}
            className="border-primary/20 shadow-none"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
