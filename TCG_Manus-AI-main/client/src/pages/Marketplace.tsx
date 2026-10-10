import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { marketplaceAutoSyncStatusLabel } from "@shared/marketplaceAutoSync";
import { marketplaceFilterLabel, marketplaceMetricFilter, MARKETPLACE_FILTER_STORAGE_KEY, MARKETPLACE_SEARCH_STORAGE_KEY, parseMarketplaceFilter, parseMarketplaceSearch, shouldClearMarketplaceFiltersOnKey, type MarketplaceFilter } from "@shared/marketplaceMetricFilter";
import { getMarketplacePriceChange, getMarketplacePriceTrend, marketplacePriceSourceLabel, parseMarketplaceHistoryPeriod, type MarketplaceHistoryPeriod, type MarketplacePriceHistoryPoint, type MarketplacePriceMovement24h } from "@shared/marketplacePriceHistory";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Link2,
  Loader2,
  Package,
  RefreshCw,
  Save,
  Search,
  SlidersHorizontal,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

type PriceUpdatePayload = { id: number; marketPrice: number };
type BulkResult = { updatedCount: number; skippedCount: number; errors: Array<{ productName: string; message: string }> };

const historyChartConfig = { price: { label: "Giá thị trường", color: "#ef4444" } } satisfies ChartConfig;

export default function Marketplace() {
  const [search, setSearch] = useState(() => typeof window === "undefined" ? "" : parseMarketplaceSearch(window.localStorage.getItem(MARKETPLACE_SEARCH_STORAGE_KEY)));
  const [filter, setFilter] = useState<MarketplaceFilter>(() => typeof window === "undefined" ? "all" : parseMarketplaceFilter(window.localStorage.getItem(MARKETPLACE_FILTER_STORAGE_KEY)));
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [syncErrors, setSyncErrors] = useState<Record<number, string>>({});
  const [historyProduct, setHistoryProduct] = useState<any | null>(null);
  const [historyPeriod, setHistoryPeriod] = useState<MarketplaceHistoryPeriod>(30);
  const utils = trpc.useUtils();
  const { data: products } = trpc.products.list.useQuery({ status: "in_stock", search: search || undefined });
  const { data: autoSyncStatus } = trpc.products.autoSyncStatus.useQuery();
  const historyProductId = historyProduct?.id ?? 0;
  const historyQueryInput = useMemo(() => ({ productId: historyProductId, days: historyPeriod }), [historyProductId, historyPeriod]);
  const priceHistoryQuery = trpc.products.priceHistory.useQuery(historyQueryInput, { enabled: historyProductId > 0 });
  const { data: priceChanges24h } = trpc.products.priceChanges24h.useQuery();
  const priceChanges24hByProductId = useMemo(() => new Map((priceChanges24h ?? []).map((change) => [change.productId, change as MarketplacePriceMovement24h])), [priceChanges24h]);
  const productList = products ?? [];
  const linkedProducts = productList.filter((product: any) => Boolean(product.snkrdunkUrl));
  const syncedProducts = linkedProducts.filter((product: any) => Boolean(product.snkrdunkLastSyncedAt));
  const pendingProducts = linkedProducts.filter((product: any) => !product.snkrdunkLastSyncedAt);
  const visibleProducts = useMemo(() => productList.filter((product: any) => {
    if (filter === "synced") return Boolean(product.snkrdunkUrl && product.snkrdunkLastSyncedAt);
    if (filter === "pending") return Boolean(product.snkrdunkUrl && !product.snkrdunkLastSyncedAt);
    if (filter === "unlinked") return !product.snkrdunkUrl;
    return true;
  }), [filter, productList]);
  const refreshProducts = () => utils.products.list.invalidate();

  const updatePrice = trpc.products.updateMarketPrice.useMutation({
    onSuccess: () => { toast.success("Đã cập nhật giá thị trường thủ công!"); refreshProducts(); },
    onError: (err) => toast.error(err.message),
  });
  const updateUrl = trpc.products.updateSnkrdunkUrl.useMutation({
    onSuccess: (_, variables) => { setSyncErrors((current) => { const next = { ...current }; delete next[variables.id]; return next; }); toast.success("Đã lưu link sản phẩm SNKRDUNK!"); refreshProducts(); },
    onError: (err) => toast.error(err.message),
  });
  const syncPrice = trpc.products.syncSnkrdunkPrice.useMutation({
    onSuccess: (result, variables) => { setSyncErrors((current) => { const next = { ...current }; delete next[variables.id]; return next; }); toast.success(`${result.productName}: giá SNKRDUNK ¥${result.marketPrice.toLocaleString("ja-JP")}`); refreshProducts(); },
    onError: (err, variables) => { setSyncErrors((current) => ({ ...current, [variables.id]: err.message })); toast.error(err.message); },
  });
  const syncAll = trpc.products.syncAllSnkrdunk.useMutation({
    onSuccess: (result) => {
      setBulkProgress(100); setBulkResult(result); setBulkError(null); setSyncErrors((current) => { const next = { ...current }; result.errors.forEach((error) => { const matchingProduct = productList.find((product: any) => product.name === error.productName); if (matchingProduct) next[matchingProduct.id] = error.message; }); return next; }); refreshProducts();
      if (result.updatedCount > 0) toast.success(`Đã đồng bộ ${result.updatedCount} sản phẩm SNKRDUNK. Bỏ qua ${result.skippedCount} sản phẩm.`);
      else if (result.errors.length === 0) toast.info(`Chưa có sản phẩm nào được gắn link SNKRDUNK. Đã bỏ qua ${result.skippedCount} sản phẩm.`);
      result.errors.forEach((error) => toast.error(`${error.productName}: ${error.message}`));
    },
    onError: (err) => { setBulkProgress(100); setBulkError(err.message); toast.error(err.message); },
  });

  useEffect(() => {
    if (!syncAll.isPending) return;
    setBulkProgress(8);
    const timer = window.setInterval(() => setBulkProgress((current) => Math.min(current + 7, 88)), 650);
    return () => window.clearInterval(timer);
  }, [syncAll.isPending]);

  useEffect(() => {
    window.localStorage.setItem(MARKETPLACE_FILTER_STORAGE_KEY, filter);
  }, [filter]);

  useEffect(() => {
    window.localStorage.setItem(MARKETPLACE_SEARCH_STORAGE_KEY, search);
  }, [search]);

  const startBulkSync = () => {
    setBulkProgress(0); setBulkResult(null); setBulkError(null); setBulkOpen(true); syncAll.mutate();
  };
  const clearFilters = () => { setSearch(""); setFilter("all"); };
  const hasActiveFilters = filter !== "all" || Boolean(search.trim());

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (!shouldClearMarketplaceFiltersOnKey(event.key, hasActiveFilters)) return;
      event.preventDefault();
      clearFilters();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [hasActiveFilters]);

  return (
    <div className="space-y-6 pb-8">
      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card/80 p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-red-600"><BarChart3 className="h-4 w-4" />Market intelligence</div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">Marketplace</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Theo dõi chênh lệch giá, trạng thái link và đồng bộ giá lựa chọn đầu tiên từ SNKRDUNK.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className={autoSyncStatus?.isEnabled ? "font-medium text-emerald-700" : "font-medium text-amber-700"}>{autoSyncStatus?.isEnabled ? `Tự động mỗi 6 giờ · tối đa ${autoSyncStatus.batchSize} sản phẩm/lần` : "Đang chuẩn bị đồng bộ tự động mỗi 6 giờ"}</span>
            {autoSyncStatus?.lastRunStatus && <span className={`rounded-full px-2 py-0.5 font-semibold ${autoSyncStatus.lastRunStatus === "success" ? "bg-emerald-100 text-emerald-800" : autoSyncStatus.lastRunStatus === "partial" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}`}>{marketplaceAutoSyncStatusLabel(autoSyncStatus.lastRunStatus)}</span>}
            {autoSyncStatus?.lastRunAt && <span className="text-muted-foreground">Lần gần nhất: {new Date(autoSyncStatus.lastRunAt).toLocaleString("vi-VN")}</span>}
          </div>
          {autoSyncStatus?.lastRunSummary && <p className="mt-1 text-xs text-muted-foreground">{autoSyncStatus.lastRunSummary}</p>}
        </div>
        <Button className="bg-primary text-primary-foreground shadow-md shadow-red-500/20 hover:bg-primary/90" onClick={startBulkSync} disabled={syncAll.isPending || linkedProducts.length === 0}>
          {syncAll.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />} Đồng bộ tất cả giá
        </Button>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard icon={<Package className="h-5 w-5" />} label="Tổng sản phẩm" value={productList.length} tone="neutral" active={filter === marketplaceMetricFilter.total} onClick={() => setFilter(marketplaceMetricFilter.total)} />
        <MetricCard icon={<CheckCircle2 className="h-5 w-5" />} label="Đã đồng bộ" value={syncedProducts.length} tone="success" active={filter === marketplaceMetricFilter.synced} onClick={() => setFilter(marketplaceMetricFilter.synced)} />
        <MetricCard icon={<Clock3 className="h-5 w-5" />} label="Chờ đồng bộ" value={pendingProducts.length} tone="warning" active={filter === marketplaceMetricFilter.pending} onClick={() => setFilter(marketplaceMetricFilter.pending)} />
        <MetricCard icon={<Link2 className="h-5 w-5" />} label="Chưa gắn link" value={productList.length - linkedProducts.length} tone="danger" active={filter === marketplaceMetricFilter.unlinked} onClick={() => setFilter(marketplaceMetricFilter.unlinked)} />
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card/70 p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1 lg:max-w-xl"><div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs"><span className="inline-flex items-center gap-1 rounded-full border border-red-500/25 bg-red-500/10 px-2 py-1 font-medium text-red-300"><SlidersHorizontal className="h-3 w-3" />Đang xem: {marketplaceFilterLabel(filter)}</span>{search.trim() && <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-sky-500/25 bg-sky-500/10 px-2 py-1 font-medium text-sky-200"><Search className="h-3 w-3 shrink-0" /><span className="truncate">Từ khóa: “{search.trim()}”</span></span>}{hasActiveFilters && <span className="text-muted-foreground">Nhấn <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px] text-foreground">Esc</kbd> để xóa</span>}</div><div className="flex min-w-0 gap-2"><div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Tìm sản phẩm, series..." value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 border-border bg-background pl-10" aria-label="Tìm sản phẩm Marketplace" /></div><Button type="button" variant="outline" size="sm" onClick={clearFilters} disabled={!hasActiveFilters} className="h-10 shrink-0 border-border bg-background text-xs"><XCircle className="mr-1.5 h-3.5 w-3.5" />Xóa bộ lọc</Button></div></div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0"><SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" /><FilterButton active={filter === "all"} onClick={() => setFilter("all")}>Tất cả ({productList.length})</FilterButton><FilterButton active={filter === "synced"} onClick={() => setFilter("synced")}>Đã đồng bộ ({syncedProducts.length})</FilterButton><FilterButton active={filter === "pending"} onClick={() => setFilter("pending")}>Chờ đồng bộ ({pendingProducts.length})</FilterButton><FilterButton active={filter === "unlinked"} onClick={() => setFilter("unlinked")}>Chưa gắn link ({productList.length - linkedProducts.length})</FilterButton></div>
      </section>

      {visibleProducts.length === 0 ? <EmptyMarketplace /> : <MarketplaceTable products={visibleProducts} syncErrors={syncErrors} priceChanges24hByProductId={priceChanges24hByProductId} onSaveUrl={(id: number, url: string) => updateUrl.mutate({ id, snkrdunkUrl: url })} onSync={(id: number) => syncPrice.mutate({ id })} onUpdatePrice={(payload: PriceUpdatePayload) => updatePrice.mutate(payload)} onOpenHistory={setHistoryProduct} isSavingUrl={updateUrl.isPending} isSyncing={syncPrice.isPending} isUpdatingPrice={updatePrice.isPending} />}

      <PriceHistoryDialog product={historyProduct} history={(priceHistoryQuery.data ?? []) as MarketplacePriceHistoryPoint[]} period={historyPeriod} loading={priceHistoryQuery.isLoading} error={priceHistoryQuery.error?.message} onPeriodChange={(days) => setHistoryPeriod(parseMarketplaceHistoryPeriod(days))} onOpenChange={(open) => !open && setHistoryProduct(null)} />

      <Dialog open={bulkOpen} onOpenChange={(open) => !syncAll.isPending && setBulkOpen(open)}>
        <DialogContent className="border-border bg-card sm:max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-foreground">{syncAll.isPending ? <Loader2 className="h-5 w-5 animate-spin text-red-600" /> : bulkError ? <XCircle className="h-5 w-5 text-red-600" /> : <CheckCircle2 className="h-5 w-5 text-green-600" />} Đồng bộ giá SNKRDUNK hàng loạt</DialogTitle><DialogDescription>{syncAll.isPending ? `Đang xử lý ${linkedProducts.length} sản phẩm đã gắn link. Vui lòng chờ phản hồi từ SNKRDUNK.` : bulkError ? "Yêu cầu đồng bộ chưa hoàn tất. Dữ liệu giá cũ vẫn được giữ nguyên." : "Đã nhận kết quả đồng bộ. Các sản phẩm không có giá hợp lệ không bị ghi đè."}</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2"><div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Tiến trình yêu cầu</span><span className="font-semibold text-foreground">{bulkProgress}%</span></div><Progress value={bulkProgress} className="h-3" />{syncAll.isPending && <p className="text-xs text-muted-foreground">Backend đang lần lượt kiểm tra giá lựa chọn đầu tiên của từng URL.</p>}{bulkError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{bulkError}</p>}{bulkResult && <div className="grid grid-cols-3 gap-2 text-center"><ResultStat label="Đã cập nhật" value={bulkResult.updatedCount} tone="success" /><ResultStat label="Bỏ qua" value={bulkResult.skippedCount} tone="warning" /><ResultStat label="Lỗi" value={bulkResult.errors.length} tone="danger" /></div>}{bulkResult?.errors.length ? <div className="max-h-36 space-y-2 overflow-y-auto rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-700">{bulkResult.errors.map((error, index) => <p key={`${error.productName}-${index}`}><strong>{error.productName}:</strong> {error.message}</p>)}</div> : null}</div>
          {!syncAll.isPending && <Button className="w-full bg-primary text-primary-foreground" onClick={() => setBulkOpen(false)}>Đóng</Button>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricCard({ icon, label, value, tone, active, onClick }: { icon: React.ReactNode; label: string; value: number; tone: "neutral" | "success" | "warning" | "danger"; active: boolean; onClick: () => void }) {
  const toneClasses = {
    neutral: { card: "border-violet-500/40 bg-violet-950/40 text-violet-100 shadow-[0_10px_24px_rgba(76,29,149,0.18)]", icon: "bg-violet-500/15 text-violet-300" },
    success: { card: "border-green-500/50 bg-green-950/45 text-green-100 shadow-[0_10px_24px_rgba(20,83,45,0.2)]", icon: "bg-green-500/20 text-green-300" },
    warning: { card: "border-amber-500/40 bg-amber-950/35 text-amber-100 shadow-[0_10px_24px_rgba(120,53,15,0.16)]", icon: "bg-amber-500/15 text-amber-300" },
    danger: { card: "border-red-500/40 bg-red-950/35 text-red-100 shadow-[0_10px_24px_rgba(127,29,29,0.16)]", icon: "bg-red-500/15 text-red-300" },
  };
  const palette = toneClasses[tone];
  return <button type="button" onClick={onClick} aria-label={`Lọc ${label}`} aria-pressed={active} className={`w-full rounded-xl border text-left transition-[transform,box-shadow,border-color,filter] duration-150 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-0 active:scale-[0.98] ${active ? "ring-1 ring-current/60" : ""} ${palette.card}`}><span className="flex items-center gap-3 p-4"><span className={`rounded-xl p-2 ${palette.icon}`}>{icon}</span><span><span className="block text-xs font-medium text-current/75">{label}</span><span className="mt-1 block text-2xl font-bold text-current">{value}</span></span></span></button>;
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${active ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"}`}>{children}</button>;
}

function EmptyMarketplace() {
  return <div className="rounded-2xl border border-dashed border-border bg-card/60 py-16 text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500"><BarChart3 className="h-8 w-8" /></div><h3 className="mt-4 text-lg font-medium text-muted-foreground">Không có sản phẩm phù hợp</h3><p className="mt-1 text-sm text-muted-foreground/70">Thử đổi bộ lọc hoặc thêm sản phẩm vào kho.</p></div>;
}

function PriceHistoryDialog({ product, history, period, loading, error, onPeriodChange, onOpenChange }: { product: any | null; history: MarketplacePriceHistoryPoint[]; period: MarketplaceHistoryPeriod; loading: boolean; error?: string; onPeriodChange: (days: MarketplaceHistoryPeriod) => void; onOpenChange: (open: boolean) => void }) {
  const chartData = useMemo(() => history.map((point) => ({
    price: Number(point.newPrice) || 0,
    date: new Date(point.createdAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "2-digit" }),
    source: marketplacePriceSourceLabel(point.source),
  })), [history]);
  const trend = getMarketplacePriceTrend(history);
  const change = getMarketplacePriceChange(history);
  const currentPrice = Number(product?.marketPrice) || 0;
  const trendClass = trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-slate-300";
  const trendLabel = trend === "up" ? "Tăng" : trend === "down" ? "Giảm" : "Không đổi";

  return <Dialog open={Boolean(product)} onOpenChange={onOpenChange}><DialogContent className="border-border bg-card sm:max-w-3xl"><DialogHeader><DialogTitle className="flex items-center gap-2 text-foreground"><BarChart3 className="h-5 w-5 text-red-400" />Lịch sử biến động giá</DialogTitle><DialogDescription>{product ? `${product.name} · Dữ liệu được ghi nhận khi giá thị trường thay đổi.` : ""}</DialogDescription></DialogHeader>{loading ? <div className="flex h-72 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-red-400" /></div> : error ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">Không thể tải lịch sử giá: {error}</p> : <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background/50 px-3 py-2"><span className="text-xs text-muted-foreground">Khoảng thời gian biểu đồ</span><div className="flex gap-1">{([7, 30, 90] as const).map((days) => <button key={days} type="button" onClick={() => onPeriodChange(days)} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${period === days ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"}`}>{days} ngày</button>)}</div></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><PriceHistoryStat label="Giá hiện tại" value={currentPrice > 0 ? `¥${currentPrice.toLocaleString("ja-JP")}` : "—"} /><PriceHistoryStat label="Điểm dữ liệu" value={String(history.length)} /><PriceHistoryStat label="Xu hướng" value={trendLabel} className={trendClass} /><PriceHistoryStat label="Biến động" value={history.length > 1 ? `${change.amount >= 0 ? "+" : ""}¥${change.amount.toLocaleString("ja-JP")}` : "—"} className={change.amount > 0 ? "text-emerald-400" : change.amount < 0 ? "text-red-400" : "text-slate-200"} /></div>{history.length === 0 ? <div className="rounded-xl border border-dashed border-border bg-background/60 py-12 text-center"><BarChart3 className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 font-medium text-foreground">Chưa có dữ liệu biến động giá</p><p className="mt-1 text-sm text-muted-foreground">Hệ thống sẽ tự ghi nhận khi bạn đồng bộ SNKRDUNK hoặc cập nhật giá thủ công.</p></div> : <><ChartContainer config={historyChartConfig} className="h-[260px] w-full"><LineChart data={chartData} margin={{ top: 14, right: 14, left: 2, bottom: 0 }}><CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={28} /><YAxis tickLine={false} axisLine={false} tickMargin={8} width={62} tickFormatter={(value) => `¥${Number(value).toLocaleString("ja-JP")}`} /><ChartTooltip content={<ChartTooltipContent hideLabel formatter={(value) => `¥${Number(value).toLocaleString("ja-JP")}`} />} /><Line type="monotone" dataKey="price" stroke="var(--color-price)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--color-price)" }} activeDot={{ r: 5 }} /></LineChart></ChartContainer><div className="max-h-32 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-background/60">{[...history].reverse().map((point) => <div key={point.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs"><span className="text-muted-foreground">{new Date(point.createdAt).toLocaleString("vi-VN")} · {marketplacePriceSourceLabel(point.source)}</span><span className="font-semibold text-foreground">¥{Number(point.newPrice).toLocaleString("ja-JP")}</span></div>)}</div></>}</div>}</DialogContent></Dialog>;
}

function PriceHistoryStat({ label, value, className = "text-foreground" }: { label: string; value: string; className?: string }) {
  return <div className="rounded-lg border border-border bg-background/60 p-3"><p className="text-[11px] text-muted-foreground">{label}</p><p className={`mt-1 truncate text-base font-bold ${className}`}>{value}</p></div>;
}


function MarketplaceTable({ products, syncErrors, priceChanges24hByProductId, onSaveUrl, onSync, onUpdatePrice, onOpenHistory, isSavingUrl, isSyncing, isUpdatingPrice }: { products: any[]; syncErrors: Record<number, string>; priceChanges24hByProductId: Map<number, MarketplacePriceMovement24h>; onSaveUrl: (id: number, url: string) => void; onSync: (id: number) => void; onUpdatePrice: (payload: PriceUpdatePayload) => void; onOpenHistory: (product: any) => void; isSavingUrl: boolean; isSyncing: boolean; isUpdatingPrice: boolean }) {
  return <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"><div className="flex items-center justify-between border-b border-border px-4 py-3 md:px-5"><div><h2 className="font-semibold text-foreground">Danh sách theo dõi giá</h2><p className="text-xs text-muted-foreground">{products.length} sản phẩm đang hiển thị</p></div><span className="hidden text-xs text-muted-foreground sm:block">Giá tính theo ¥/SP</span></div><div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[1080px] text-left text-sm"><thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3 font-semibold">Sản phẩm</th><th className="px-4 py-3 font-semibold">Trạng thái</th><th className="px-4 py-3 text-right font-semibold">Giá mua</th><th className="px-4 py-3 text-right font-semibold">Giá thị trường</th><th className="px-4 py-3 text-right font-semibold">24 giờ</th><th className="px-4 py-3 text-right font-semibold">Chênh lệch</th><th className="px-5 py-3 text-right font-semibold">Thao tác</th></tr></thead><tbody className="divide-y divide-border">{products.map((product: any) => <MarketplaceRow key={product.id} product={product} syncError={syncErrors[product.id]} movement24h={priceChanges24hByProductId.get(product.id)} onSaveUrl={onSaveUrl} onSync={onSync} onUpdatePrice={onUpdatePrice} onOpenHistory={onOpenHistory} isSavingUrl={isSavingUrl} isSyncing={isSyncing} isUpdatingPrice={isUpdatingPrice} />)}</tbody></table></div><div className="space-y-3 p-3 lg:hidden">{products.map((product: any) => <MobileMarketplaceCard key={product.id} product={product} syncError={syncErrors[product.id]} movement24h={priceChanges24hByProductId.get(product.id)} onSaveUrl={onSaveUrl} onSync={onSync} onUpdatePrice={onUpdatePrice} onOpenHistory={onOpenHistory} isSavingUrl={isSavingUrl} isSyncing={isSyncing} isUpdatingPrice={isUpdatingPrice} />)}</div></section>;
}

function MarketplaceRow({ product, syncError, movement24h, onSaveUrl, onSync, onUpdatePrice, onOpenHistory, isSavingUrl, isSyncing, isUpdatingPrice }: { product: any; syncError?: string; movement24h?: MarketplacePriceMovement24h; onSaveUrl: (id: number, url: string) => void; onSync: (id: number) => void; onUpdatePrice: (payload: PriceUpdatePayload) => void; onOpenHistory: (product: any) => void; isSavingUrl: boolean; isSyncing: boolean; isUpdatingPrice: boolean }) {
  const [url, setUrl] = useState(product.snkrdunkUrl ?? "");
  const [editingManual, setEditingManual] = useState(false);
  const [manualPrice, setManualPrice] = useState(String(Number(product.marketPrice) || ""));
  const buyPrice = Number(product.buyPrice) || 0;
  const marketPrice = Number(product.marketPrice) || 0;
  const quantity = Number(product.quantity) || 0;
  const diff = marketPrice - buyPrice;
  const diffPercent = buyPrice > 0 ? (diff / buyPrice) * 100 : 0;
  const status = syncError ? "error" : product.snkrdunkUrl ? (product.snkrdunkLastSyncedAt ? "synced" : "pending") : "unlinked";
  const lastSynced = product.snkrdunkLastSyncedAt ? new Date(product.snkrdunkLastSyncedAt).toLocaleString("vi-VN") : null;
  return <tr className="align-top transition-colors hover:bg-muted/30"><td className="px-5 py-4"><div className="min-w-[230px]"><div className="flex items-start gap-3"><div className="mt-0.5 rounded-lg bg-red-50 p-2 text-red-600"><Package className="h-4 w-4" /></div><div><p className="font-semibold text-foreground">{product.name}</p><p className="mt-1 text-xs capitalize text-muted-foreground">{product.type} · {product.series || "Không có series"} · SL {quantity}</p></div></div><div className="mt-3 flex items-center gap-2"><Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Dán URL SNKRDUNK..." className="h-8 min-w-[200px] bg-background text-xs" aria-label={`URL SNKRDUNK cho ${product.name}`} /><Button size="sm" variant="outline" className="h-8 px-2" onClick={() => onSaveUrl(product.id, url.trim())} disabled={!url.trim() || isSavingUrl} title="Lưu URL SNKRDUNK"><Save className="h-3.5 w-3.5" /></Button>{product.snkrdunkUrl && <a href={product.snkrdunkUrl} target="_blank" rel="noreferrer" className="rounded-md p-1.5 text-red-600 hover:bg-red-50" title="Mở trang SNKRDUNK"><ExternalLink className="h-4 w-4" /></a>}</div></div></td><td className="px-4 py-4"><div className="flex min-w-[150px] flex-col items-start gap-2"><StatusBadge status={status} /><span className="text-[11px] text-muted-foreground">{lastSynced ? `Cập nhật ${lastSynced}` : product.snkrdunkUrl ? "Chưa chạy đồng bộ" : "Cần gắn URL cụ thể"}</span>{syncError && <span className="max-w-[190px] text-[11px] leading-4 text-red-600">{syncError}</span>}</div></td><td className="whitespace-nowrap px-4 py-4 text-right"><span className="font-semibold text-foreground">¥{buyPrice.toLocaleString("ja-JP")}</span><span className="mt-1 block text-[11px] text-muted-foreground">/SP</span></td><td className="whitespace-nowrap px-4 py-4 text-right"><span className="font-semibold text-foreground">{marketPrice > 0 ? `¥${marketPrice.toLocaleString("ja-JP")}` : "—"}</span><span className="mt-1 block text-[11px] text-muted-foreground">{marketPrice > 0 ? "lựa chọn đầu tiên" : "Chưa có giá"}</span></td><td className="whitespace-nowrap px-4 py-4 text-right"><PriceMovement24h movement={movement24h} /></td><td className="whitespace-nowrap px-4 py-4 text-right"><div className={`flex items-center justify-end gap-1 font-bold ${diff >= 0 ? "text-emerald-600" : "text-red-600"}`}>{diff >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />} {marketPrice > 0 ? `${diff >= 0 ? "+" : ""}¥${diff.toLocaleString("ja-JP")}` : "—"}</div><span className={`mt-1 block text-[11px] ${diff >= 0 ? "text-emerald-600" : "text-red-600"}`}>{marketPrice > 0 ? `${diffPercent >= 0 ? "+" : ""}${diffPercent.toFixed(1)}% · tổng ¥${(diff * quantity).toLocaleString("ja-JP")}` : "Chưa đủ dữ liệu"}</span></td><td className="px-5 py-4 text-right"><div className="flex min-w-[160px] flex-col items-end gap-2"><Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => onOpenHistory(product)}><BarChart3 className="mr-1 h-3.5 w-3.5" />Lịch sử giá</Button><Button size="sm" className="h-8 bg-primary text-primary-foreground" onClick={() => onSync(product.id)} disabled={!product.snkrdunkUrl || isSyncing}>{isSyncing ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1 h-3.5 w-3.5" />} Đồng bộ</Button>{!editingManual ? <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setEditingManual(true)}>Nhập giá thủ công</Button> : <div className="flex gap-1"><Input type="number" min="0" value={manualPrice} onChange={(event) => setManualPrice(event.target.value)} className="h-8 w-24 text-xs" placeholder="Giá" /><Button size="sm" className="h-8 bg-primary px-2 text-xs text-primary-foreground" disabled={isUpdatingPrice} onClick={() => { onUpdatePrice({ id: product.id, marketPrice: parseFloat(manualPrice) || 0 }); setEditingManual(false); }}>Lưu</Button></div>}</div></td></tr>;
}

function PriceMovement24h({ movement }: { movement?: MarketplacePriceMovement24h }) {
  if (!movement?.hasData) return <span className="text-xs text-muted-foreground">—</span>;
  const positive = movement.trend === "up";
  const negative = movement.trend === "down";
  const className = positive ? "text-emerald-500" : negative ? "text-red-500" : "text-muted-foreground";
  return <div className={`flex flex-col items-end ${className}`}><span className="flex items-center gap-1 font-bold">{positive ? <ArrowUpRight className="h-4 w-4" /> : negative ? <ArrowDownRight className="h-4 w-4" /> : null}{movement.amount >= 0 ? "+" : ""}¥{movement.amount.toLocaleString("ja-JP")}</span><span className="mt-1 text-[11px]">{movement.percent >= 0 ? "+" : ""}{movement.percent.toFixed(1)}% · 24h</span></div>;
}

function StatusBadge({ status }: { status: "synced" | "pending" | "unlinked" | "error" }) {
  const config = { synced: { label: "Đã đồng bộ", className: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 }, pending: { label: "Chờ đồng bộ", className: "bg-amber-100 text-amber-700", icon: Clock3 }, unlinked: { label: "Chưa gắn link", className: "bg-red-100 text-red-700", icon: TriangleAlert }, error: { label: "Lỗi đồng bộ", className: "bg-red-100 text-red-700", icon: XCircle } }[status];
  const Icon = config.icon;
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${config.className}`}><Icon className="h-3.5 w-3.5" />{config.label}</span>;
}

function ResultStat({ label, value, tone }: { label: string; value: number; tone: "success" | "warning" | "danger" }) {
  const classes = { success: "bg-emerald-50 text-emerald-700", warning: "bg-amber-50 text-amber-700", danger: "bg-red-50 text-red-700" };
  return <div className={`rounded-lg p-3 ${classes[tone]}`}><p className="text-xl font-bold">{value}</p><p className="text-[11px] font-medium">{label}</p></div>;
}

function MobileMarketplaceCard({ product, syncError, movement24h, onSaveUrl, onSync, onUpdatePrice, onOpenHistory, isSavingUrl, isSyncing, isUpdatingPrice }: { product: any; syncError?: string; movement24h?: MarketplacePriceMovement24h; onSaveUrl: (id: number, url: string) => void; onSync: (id: number) => void; onUpdatePrice: (payload: PriceUpdatePayload) => void; onOpenHistory: (product: any) => void; isSavingUrl: boolean; isSyncing: boolean; isUpdatingPrice: boolean }) {
  const [url, setUrl] = useState(product.snkrdunkUrl ?? "");
  const [editingManual, setEditingManual] = useState(false);
  const [manualPrice, setManualPrice] = useState(String(Number(product.marketPrice) || ""));
  const buyPrice = Number(product.buyPrice) || 0;
  const marketPrice = Number(product.marketPrice) || 0;
  const quantity = Number(product.quantity) || 0;
  const diff = marketPrice - buyPrice;
  const diffPercent = buyPrice > 0 ? (diff / buyPrice) * 100 : 0;
  const status = syncError ? "error" : product.snkrdunkUrl ? (product.snkrdunkLastSyncedAt ? "synced" : "pending") : "unlinked";
  const lastSynced = product.snkrdunkLastSyncedAt ? new Date(product.snkrdunkLastSyncedAt).toLocaleString("vi-VN") : null;
  return <article className="rounded-xl border border-border bg-background p-3 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-2"><div className="rounded-lg bg-red-50 p-2 text-red-600"><Package className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate font-semibold text-foreground">{product.name}</p><p className="mt-1 text-xs capitalize text-muted-foreground">{product.type} · {product.series || "Không có series"} · SL {quantity}</p></div></div><StatusBadge status={status} /></div><div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-2 text-center"><div><p className="text-[10px] text-muted-foreground">Giá mua</p><p className="mt-1 text-sm font-bold">¥{buyPrice.toLocaleString("ja-JP")}</p></div><div><p className="text-[10px] text-muted-foreground">Thị trường</p><p className="mt-1 text-sm font-bold">{marketPrice > 0 ? `¥${marketPrice.toLocaleString("ja-JP")}` : "—"}</p></div><div><p className="text-[10px] text-muted-foreground">Chênh lệch</p><p className={`mt-1 text-sm font-bold ${diff >= 0 ? "text-emerald-600" : "text-red-600"}`}>{marketPrice > 0 ? `${diff >= 0 ? "+" : ""}¥${diff.toLocaleString("ja-JP")}` : "—"}</p></div></div><p className={`mt-2 text-xs ${diff >= 0 ? "text-emerald-600" : "text-red-600"}`}>{marketPrice > 0 ? `${diffPercent >= 0 ? "+" : ""}${diffPercent.toFixed(1)}% · tổng chênh lệch ¥${(diff * quantity).toLocaleString("ja-JP")}` : "Chưa đủ dữ liệu giá"}</p><div className="mt-3 flex gap-2"><Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Dán URL SNKRDUNK..." className="h-9 min-w-0 flex-1 bg-background text-xs" aria-label={`URL SNKRDUNK cho ${product.name}`} /><Button size="sm" variant="outline" className="h-9 px-2" onClick={() => onSaveUrl(product.id, url.trim())} disabled={!url.trim() || isSavingUrl} title="Lưu URL SNKRDUNK"><Save className="h-3.5 w-3.5" /></Button>{product.snkrdunkUrl && <a href={product.snkrdunkUrl} target="_blank" rel="noreferrer" className="rounded-md border border-border p-2 text-red-600" title="Mở trang SNKRDUNK"><ExternalLink className="h-4 w-4" /></a>}</div><div className="mt-2 flex items-center justify-between gap-2"><span className="min-w-0 text-[11px] text-muted-foreground">{syncError ? syncError : lastSynced ? `Cập nhật ${lastSynced}` : product.snkrdunkUrl ? "Chưa chạy đồng bộ" : "Cần gắn URL cụ thể"}</span><Button size="sm" className="h-8 shrink-0 bg-primary text-primary-foreground" onClick={() => onSync(product.id)} disabled={!product.snkrdunkUrl || isSyncing}>{isSyncing ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1 h-3.5 w-3.5" />} Đồng bộ</Button></div><Button size="sm" variant="outline" className="mt-2 h-8 w-full text-xs" onClick={() => onOpenHistory(product)}><BarChart3 className="mr-1 h-3.5 w-3.5" />Lịch sử giá</Button>{!editingManual ? <Button size="sm" variant="outline" className="mt-2 h-8 w-full text-xs" onClick={() => setEditingManual(true)}>Nhập giá thủ công</Button> : <div className="mt-2 flex gap-2"><Input type="number" min="0" value={manualPrice} onChange={(event) => setManualPrice(event.target.value)} className="h-8 text-xs" placeholder="Giá mới" /><Button size="sm" className="h-8 bg-primary px-3 text-xs text-primary-foreground" disabled={isUpdatingPrice} onClick={() => { onUpdatePrice({ id: product.id, marketPrice: parseFloat(manualPrice) || 0 }); setEditingManual(false); }}>Lưu</Button></div>}</article>;
}
