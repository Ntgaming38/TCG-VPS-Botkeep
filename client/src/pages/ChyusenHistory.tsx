import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { CheckCircle2, Clock3, Gift, History, RotateCcw, Search, Trophy, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  formatChyusenResultDate,
  getChyusenResultOutcome,
  summarizeChyusenResultHistory,
  type ChyusenResultOutcome,
} from "@shared/chyusenResultHistory";

const OUTCOME_FILTERS = [
  { value: "all", label: "Tất cả" },
  { value: "won", label: "Đã trúng" },
  { value: "lost", label: "Trượt" },
  { value: "cancelled", label: "Hủy" },
] as const;

type OutcomeFilter = typeof OUTCOME_FILTERS[number]["value"];

function displayChyusenShop(entry: { shop?: string | null; customShopName?: string | null }) {
  return entry.customShopName?.trim() || entry.shop?.trim() || "Khác";
}

function outcomeBadgeClass(outcome: ChyusenResultOutcome) {
  if (outcome === "won") return "border-yellow-300 bg-yellow-400/20 text-yellow-200";
  if (outcome === "lost") return "border-slate-400/60 bg-slate-500/20 text-slate-200";
  return "border-red-400/60 bg-red-500/20 text-red-200";
}

function OutcomeIcon({ outcome }: { outcome: ChyusenResultOutcome }) {
  if (outcome === "won") return <Trophy className="h-4 w-4" />;
  if (outcome === "lost") return <XCircle className="h-4 w-4" />;
  return <CheckCircle2 className="h-4 w-4" />;
}

export default function ChyusenHistory() {
  const { data: entries = [], isLoading } = trpc.chyusen.resultHistory.useQuery();
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<OutcomeFilter>("all");
  const [search, setSearch] = useState("");

  const invalidate = () => {
    utils.chyusen.resultHistory.invalidate();
    utils.chyusen.list.invalidate();
    utils.trash.list.invalidate();
    utils.dashboard.stats.invalidate();
  };

  const purchaseDraft = trpc.chyusen.purchaseDraft.useMutation({
    onSuccess: (data) => {
      localStorage.setItem("tcg-manager-chyusen-purchase-draft", JSON.stringify(data));
      setLocation("/mua-hang");
    },
    onError: (error) => toast.error(error.message),
  });
  const markPurchaseCreated = trpc.chyusen.markPurchaseCreated.useMutation({
    onSuccess: () => {
      toast.success("Đã xác nhận mua hàng. Chyusen đã hoàn tất.");
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const undoWon = trpc.chyusen.undoWon.useMutation({
    onSuccess: () => {
      toast.success("Đã hoàn tác trạng thái Đã trúng. Chyusen quay lại Đã đăng ký.");
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const setParticipation = trpc.chyusen.setParticipation.useMutation({
    onSuccess: (data: any) => {
      toast.success(data?.trashed ? "Đã trượt. Chyusen đã được chuyển vào Thùng rác." : "Đã cập nhật trạng thái.");
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });


  const historyRows = useMemo(() => {
    return (entries as any[])
      .map((entry) => ({ entry, outcome: getChyusenResultOutcome(entry) }))
      .filter((row): row is { entry: any; outcome: ChyusenResultOutcome } => row.outcome !== null);
  }, [entries]);

  const stats = useMemo(
    () => summarizeChyusenResultHistory(historyRows.map((row) => row.outcome)),
    [historyRows],
  );

  const visibleRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const matched = historyRows.filter((row) => {
      const matchesFilter = filter === "all" || row.outcome === filter;
      const matchesSearch =
        !normalizedSearch ||
        [row.entry.title, row.entry.productName, row.entry.shop, row.entry.customShopName, row.entry.series].some((value) =>
          String(value || "").toLowerCase().includes(normalizedSearch),
        );
      return matchesFilter && matchesSearch;
    });
    return matched.sort((a, b) => {
      // Mặc định: ngày có kết quả gần nhất trước.
      const left = new Date(a.entry.resultDate ?? a.entry.createdAt).getTime();
      const right = new Date(b.entry.resultDate ?? b.entry.createdAt).getTime();
      if (right !== left) return right - left;
      return Number(b.entry.id) - Number(a.entry.id);
    });
  }, [historyRows, filter, search]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <History className="h-7 w-7 text-red-600" />
          <h1 className="text-2xl font-bold text-foreground">Lịch sử Chūsen</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Các lượt Chūsen đã có kết quả: Đã trúng, Trượt hoặc Hủy. Lượt chưa có kết quả không xuất hiện tại đây.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Tổng lượt</p><p className="mt-1 text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card className="border-yellow-400/40"><CardContent className="p-4"><p className="flex items-center gap-1 text-xs text-yellow-200/90"><Trophy className="h-3.5 w-3.5" />Đã trúng</p><p className="mt-1 text-2xl font-bold text-yellow-200">{stats.won}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="flex items-center gap-1 text-xs text-muted-foreground"><XCircle className="h-3.5 w-3.5" />Trượt</p><p className="mt-1 text-2xl font-bold">{stats.lost}</p></CardContent></Card>
        <Card className="border-red-400/40"><CardContent className="p-4"><p className="text-xs text-red-200/90">Hủy</p><p className="mt-1 text-2xl font-bold text-red-200">{stats.cancelled}</p></CardContent></Card>
        <Card className="col-span-2 border-emerald-400/40 sm:col-span-1"><CardContent className="p-4"><p className="text-xs text-emerald-200/90">Tỷ lệ trúng</p><p className="mt-1 text-2xl font-bold text-emerald-200">{stats.winRate === null ? "—" : `${Math.round(stats.winRate * 1000) / 10}%`}</p>{stats.winRate === null && <p className="mt-1 text-[11px] text-muted-foreground">Chưa có lượt trúng/trượt</p>}</CardContent></Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo sản phẩm, cửa hàng hoặc series..."
            className="pl-9"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={filter} onValueChange={(value) => setFilter(value as OutcomeFilter)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {OUTCOME_FILTERS.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Đang tải lịch sử Chūsen...</div>
      ) : visibleRows.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-14 text-center">
            <History className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
            <h2 className="font-semibold">Chưa có lượt nào có kết quả</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Khi bạn xác nhận Đã trúng, Trượt hoặc Hủy một lượt Chūsen, lượt đó sẽ xuất hiện tại đây.
            </p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/chyusen">Đến trang Chūsen</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {visibleRows.map(({ entry, outcome }) => {
            const registeredDate = formatChyusenResultDate(entry.createdAt) || formatChyusenResultDate(entry.applicationStart);
            const deadlineDate = formatChyusenResultDate(entry.applicationEnd);
            const resultDate = formatChyusenResultDate(entry.resultDate);
            return (
              <Card key={entry.id} className="overflow-hidden">
                <CardHeader className="space-y-2 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate text-base leading-snug sm:text-lg">{entry.title}</CardTitle>
                      <CardDescription className="mt-1 truncate">
                        {displayChyusenShop(entry)} · {entry.productType} · {entry.series || "Pokemon"}
                      </CardDescription>
                    </div>
                    <Badge className={`shrink-0 gap-1 ${outcomeBadgeClass(outcome)}`}>
                      <OutcomeIcon outcome={outcome} />
                      {outcome === "won" ? "Đã trúng" : outcome === "lost" ? "Trượt" : "Hủy"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-secondary/55 p-3">
                    <p className="text-xs text-muted-foreground">Ngày đăng ký</p>
                    <p className="mt-1 font-medium">{registeredDate || "Chưa có thông tin"}</p>
                  </div>
                  <div className="rounded-lg bg-secondary/55 p-3">
                    <p className="text-xs text-muted-foreground">Hạn đăng ký</p>
                    <p className="mt-1 font-medium">{deadlineDate || "Chưa có thông tin"}</p>
                  </div>
                  <div className="rounded-lg bg-secondary/55 p-3">
                    <p className="flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />Ngày công bố</p>
                    <p className="mt-1 font-medium">{resultDate || "Chưa có thông tin"}</p>
                  </div>
                  <div className="rounded-lg bg-secondary/55 p-3">
                    <p className="text-xs text-muted-foreground">Mua Hàng</p>
                    {entry.purchaseCreatedAt ? (
                      <p className="mt-1 font-medium text-emerald-300">Đã chuyển sang Mua Hàng</p>
                    ) : outcome === "won" ? (
                      <Button
                        size="sm"
                        className="mt-1 h-7 bg-red-600 px-2 text-xs text-white hover:bg-red-700"
                        disabled={purchaseDraft.isPending}
                        onClick={() => purchaseDraft.mutate({ id: entry.id })}
                      >
                        <Gift className="mr-1 h-3 w-3" />Thêm vào Mua Hàng
                      </Button>
                    ) : (
                      <p className="mt-1 text-muted-foreground">—</p>
                    )}
                  </div>
                </CardContent>
                {outcome === "won" && !entry.purchaseCreatedAt && (
                  <CardContent className="flex flex-wrap gap-2 border-t border-border/40 pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-emerald-400/70 text-emerald-300 hover:bg-emerald-500/15 hover:text-emerald-200"
                      disabled={markPurchaseCreated.isPending}
                      onClick={() => markPurchaseCreated.mutate({ id: entry.id })}
                    >
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />{markPurchaseCreated.isPending ? "Đang hoàn tất..." : "Đã mua hàng"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-amber-400/70 text-amber-300 hover:bg-amber-500/15 hover:text-amber-200"
                      disabled={undoWon.isPending}
                      onClick={() => undoWon.mutate({ id: entry.id })}
                    >
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" />Hoàn tác Đã trúng
                    </Button>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
