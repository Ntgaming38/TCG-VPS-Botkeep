import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RankBadge } from "@/components/RankBadge";
import { trpc } from "@/lib/trpc";
import { formatYen } from "@shared/formatYen";
import { BarChart3, Box, Copy, ExternalLink, Link2, Loader2, Package, PaintBucket, Pencil, Plus, RefreshCw, Search, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { ProductImageAdjuster } from "@/components/ProductImageAdjuster";
import { ProductImageEditControls } from "@/components/ProductImageEditControls";
import { ProductNameSuggestions } from "@/components/ProductNameSuggestions";

type ShopType = "card" | "box" | "pack";
type WatchItem = {
  id: number;
  name: string;
  productType: ShopType;
  cardRank: string | null;
  sourceUrl: string;
  sourceTitle: string | null;
  imageUrl: string | null;
  imageZoom: string | number | null;
  imagePositionX: string | number | null;
  imagePositionY: string | number | null;
  currentPrice: string | number;
  lastSyncedAt: Date | null;
  lastSyncError: string | null;
  createdAt: Date;
};
type PricePoint = { id: number; price: string | number; source: string; createdAt: Date };
type SparklinePoint7d = { price: string | number; createdAt: Date };

const priceChartConfig = { price: { label: "Giá SNKRDUNK", color: "#14b8a6" } } satisfies ChartConfig;

function getTypeLabel(type: ShopType) {
  return type === "card" ? "Card" : type === "box" ? "Box" : "Pack";
}

function getTypeIcon(type: ShopType) {
  return type === "box" ? <Box className="h-4 w-4" /> : <Package className="h-4 w-4" />;
}

async function copySnkrdunkUrl(sourceUrl: string) {
  try {
    await navigator.clipboard.writeText(sourceUrl);
    toast.success("Đã sao chép URL SNKRDUNK.");
  } catch {
    toast.error("Không thể sao chép URL. Hãy thử lại.");
  }
}

export default function SnkrShop() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | ShopType>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState<WatchItem | null>(null);
  const [editItem, setEditItem] = useState<WatchItem | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<WatchItem | null>(null);
  const [historyDays, setHistoryDays] = useState<7 | 30 | 90>(30);
  const [form, setForm] = useState<{ name: string; productType: ShopType; cardRank: "A" | "B" | "C" | "D"; sourceUrl: string }>({ name: "", productType: "box", cardRank: "A", sourceUrl: "" });
  const [editForm, setEditForm] = useState({ name: "", sourceUrl: "", productType: "box" as ShopType, imageZoom: 1.12, imagePositionX: 0, imagePositionY: 0 });
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const { data: items = [], isLoading } = trpc.snkrShop.list.useQuery({ search: search.trim() || undefined });
  const trendHistory7dQuery = trpc.snkrShop.trendHistory7d.useQuery();
  const selectedId = historyItem?.id ?? 0;
  const historyInput = useMemo(() => ({ id: selectedId, days: historyDays }), [historyDays, selectedId]);
  const historyQuery = trpc.snkrShop.priceHistory.useQuery(historyInput, { enabled: selectedId > 0 });

  const refresh = () => {
    void utils.snkrShop.list.invalidate();
    void utils.snkrShop.priceHistory.invalidate();
    void utils.snkrShop.trendHistory7d.invalidate();
  };
  const syncItem = trpc.snkrShop.sync.useMutation({
    onSuccess: (result) => { toast.success(`${result.name}: ${formatYen(result.currentPrice)}`); refresh(); },
    onError: (error) => toast.error(error.message),
  });
  const syncAll = trpc.snkrShop.syncAll.useMutation({
    onSuccess: (result) => {
      toast.success(`Đã đồng bộ ${result.syncedCount}/${result.totalCount} mục${result.failedCount ? ` · ${result.failedCount} lỗi` : ""}`);
      refresh();
    },
    onError: (error) => toast.error(error.message),
  });
  const createItem = trpc.snkrShop.create.useMutation({
    onSuccess: (item) => {
      if (item.alreadyTracked) {
        toast.info("Sản phẩm này đã được theo dõi. Đang mở chi tiết...");
        setAddOpen(false);
        setForm({ name: "", productType: "box", cardRank: "A", sourceUrl: "" });
        setLocation(`/shop-snkr/${item.id}`);
        return;
      }
      toast.success("Đã thêm vào Shop SNKR. Đang lấy giá đầu tiên...");
      setAddOpen(false);
      setForm({ name: "", productType: "box", cardRank: "A", sourceUrl: "" });
      refresh();
      syncItem.mutate({ id: item.id });
    },
    onError: (error) => toast.error(error.message),
  });
  const deleteItem = trpc.snkrShop.delete.useMutation({
    onSuccess: () => { setDeleteConfirmItem(null); toast.success("Đã bỏ sản phẩm khỏi Shop SNKR."); refresh(); },
    onError: (error) => toast.error(error.message),
  });
  const updateItem = trpc.snkrShop.update.useMutation({
    onSuccess: (item) => {
      toast.success("Đã cập nhật thông tin Shop SNKR. Đang lấy giá mới...");
      setEditItem(null);
      refresh();
      syncItem.mutate({ id: item.id });
    },
    onError: (error) => toast.error(error.message),
  });
  const whitenItem = trpc.snkrShop.whitenImage.useMutation({
    onSuccess: (item) => { toast.success(`${item.name}: ${item.message}`); refresh(); },
    onError: (error) => toast.error(`Tẩy nền thất bại: ${error.message}`),
  });

  const watchItems = items as WatchItem[];
  const syncedCount = watchItems.filter((item) => Boolean(item.lastSyncedAt)).length;
  const pendingCount = watchItems.length - syncedCount;
  const sparklineByItem = useMemo(() => new Map<number, SparklinePoint7d[]>((trendHistory7dQuery.data ?? []).map((entry) => [entry.itemId, entry.points])), [trendHistory7dQuery.data]);
  const typeMatchedItems = typeFilter === "all" ? watchItems : watchItems.filter((item) => item.productType === typeFilter);
  const displayedItems = typeMatchedItems;
  const bulkSyncEtaSeconds = Math.max(8, Math.ceil(watchItems.length / 3) * 8);
  const submitAdd = () => {
    if (!form.sourceUrl.trim()) { toast.error("Hãy nhập URL SNKRDUNK."); return; }
    createItem.mutate({ name: form.name.trim() || undefined, productType: form.productType, cardRank: form.productType === "card" ? form.cardRank : undefined, sourceUrl: form.sourceUrl.trim() });
  };
  const openEdit = (item: WatchItem) => {
    setEditItem(item);
    setEditForm({ name: item.name, sourceUrl: item.sourceUrl, productType: item.productType, imageZoom: Number(item.imageZoom) || 1.12, imagePositionX: Number(item.imagePositionX) || 0, imagePositionY: Number(item.imagePositionY) || 0 });
  };
  const submitEdit = () => {
    if (!editItem || !editForm.sourceUrl.trim()) { toast.error("Hãy nhập URL SNKRDUNK."); return; }
    updateItem.mutate({ id: editItem.id, name: editForm.name.trim() || undefined, sourceUrl: editForm.sourceUrl.trim(), productType: editForm.productType, imageZoom: editForm.imageZoom, imagePositionX: editForm.imagePositionX, imagePositionY: editForm.imagePositionY });
  };

  return (
    <div className="space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-2xl border border-teal-500/30 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.22),transparent_45%),linear-gradient(135deg,rgba(15,23,42,0.94),rgba(20,83,45,0.36))] p-5 shadow-sm md:p-6">
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-teal-300"><ShieldCheck className="h-4 w-4" />Theo dõi độc lập</div>
            <h1 className="text-2xl font-black tracking-tight text-white md:text-3xl">Shop SNKR</h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">Theo dõi giá Box, Card và Pack trên SNKRDUNK bằng URL riêng. Dữ liệu tại đây <strong className="font-semibold text-teal-200">không cộng vào Kho Hàng, vốn, doanh thu hoặc lợi nhuận</strong>.</p>
          </div>
          <div className="flex flex-wrap gap-2"><Button onClick={() => syncAll.mutate()} disabled={watchItems.length === 0 || syncAll.isPending} variant="outline" className="h-11 border-teal-400/40 bg-slate-950/30 text-teal-100 hover:bg-teal-500/15"><RefreshCw className={`mr-2 h-4 w-4 ${syncAll.isPending ? "animate-spin" : ""}`} />{syncAll.isPending ? `Đang đồng bộ · ~${bulkSyncEtaSeconds}s` : "Đồng bộ tất cả"}</Button><Button onClick={() => setAddOpen(true)} className="h-11 shrink-0 bg-teal-500 font-semibold text-slate-950 shadow-lg shadow-teal-500/20 hover:bg-teal-400"><Plus className="mr-2 h-4 w-4" />Thêm sản phẩm theo dõi</Button></div>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <SummaryCard label="Đang theo dõi" value={watchItems.length} icon={<Package className="h-4 w-4" />} tone="teal" />
        <SummaryCard label="Đã có giá" value={syncedCount} icon={<ShieldCheck className="h-4 w-4" />} tone="green" />
        <SummaryCard label="Chờ lấy giá" value={pendingCount} icon={<RefreshCw className="h-4 w-4" />} tone="amber" />
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card/70 p-3 shadow-sm">
        <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 bg-background pl-10" placeholder="Tìm sản phẩm Shop SNKR..." aria-label="Tìm sản phẩm Shop SNKR" /></div>
        <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap gap-1.5">{(["all", "box", "card", "pack"] as const).map((type) => <Button key={type} size="sm" variant={typeFilter === type ? "default" : "outline"} onClick={() => setTypeFilter(type)} className={typeFilter === type ? "bg-teal-500 text-slate-950 hover:bg-teal-400" : "border-border bg-background text-muted-foreground"}>{type === "all" ? `Tất cả (${watchItems.length})` : `${getTypeLabel(type)} (${watchItems.filter((item) => item.productType === type).length})`}</Button>)}</div><span className="text-xs text-muted-foreground">Xu hướng giá 7 ngày · dữ liệu độc lập với Marketplace</span></div>
      </section>

      {isLoading ? <div className="flex h-52 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-teal-400" /></div> : watchItems.length === 0 ? <EmptyWatchlist onAdd={() => setAddOpen(true)} /> : displayedItems.length === 0 ? <div className="rounded-2xl border border-dashed border-border py-14 text-center text-sm text-muted-foreground">{`Không có sản phẩm loại ${getTypeLabel(typeFilter as ShopType)} khớp bộ lọc.`}</div> : <section className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{displayedItems.map((item) => <ShopGridCard key={item.id} item={item} sparklinePoints={sparklineByItem.get(item.id)} onOpen={() => setLocation(`/shop-snkr/${item.id}`)} onSync={() => syncItem.mutate({ id: item.id })} onEdit={() => openEdit(item)} onDelete={() => setDeleteConfirmItem(item)} onWhiten={() => whitenItem.mutate({ id: item.id })} syncing={syncItem.isPending && syncItem.variables?.id === item.id} deleting={deleteItem.isPending && deleteItem.variables?.id === item.id} whitening={whitenItem.isPending && whitenItem.variables?.id === item.id} />)}</section>}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] max-w-[calc(100%-1rem)] overflow-y-auto border-border bg-card p-4 sm:max-w-xl sm:p-6">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-foreground"><Link2 className="h-5 w-5 text-teal-400" />Thêm sản phẩm Shop SNKR</DialogTitle><DialogDescription>Gắn URL trang sản phẩm SNKRDUNK để theo dõi giá riêng. Không tạo hàng trong Kho Hàng.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Tên sản phẩm (tùy chọn)"><Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Để trống để tự lấy từ URL SNKRDUNK" /><ProductNameSuggestions search={form.name} onSelect={(product) => setForm((current) => ({ ...current, name: product.name, productType: (product.type === "junk_pack" ? "pack" : product.type) as ShopType }))} /></Field>
            <div className="grid gap-3 sm:grid-cols-2"><Field label="Loại sản phẩm"><Select value={form.productType} onValueChange={(value) => setForm((current) => ({ ...current, productType: value as ShopType }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="box">Box</SelectItem><SelectItem value="pack">Pack</SelectItem><SelectItem value="card">Card</SelectItem></SelectContent></Select></Field>{form.productType === "card" && <Field label="Rank Card"><Select value={form.cardRank} onValueChange={(value) => setForm((current) => ({ ...current, cardRank: value as "A" | "B" | "C" | "D" }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="A">Rank A</SelectItem><SelectItem value="B">Rank B</SelectItem><SelectItem value="C">Rank C</SelectItem><SelectItem value="D">Rank D</SelectItem></SelectContent></Select></Field>}</div>
            <Field label="URL SNKRDUNK"><Input value={form.sourceUrl} onChange={(event) => setForm((current) => ({ ...current, sourceUrl: event.target.value }))} placeholder="https://snkrdunk.com/..." inputMode="url" /></Field>
            <p className="rounded-lg border border-teal-500/20 bg-teal-500/10 p-3 text-xs leading-5 text-teal-100">Sau khi thêm, Shop SNKR sẽ tự lấy tên, hình đại diện công khai (nếu có) và giá đầu tiên từ URL. Giá này chỉ nằm trong mục theo dõi, không ảnh hưởng bất kỳ số liệu kinh doanh nào.</p>
          </div>
          <Button onClick={submitAdd} disabled={createItem.isPending || syncItem.isPending} className="w-full bg-teal-500 font-semibold text-slate-950 hover:bg-teal-400">{createItem.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Thêm và theo dõi giá</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editItem)} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] max-w-[calc(100%-1rem)] overflow-y-auto border-border bg-card p-4 sm:max-w-xl sm:p-6">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-foreground"><Pencil className="h-5 w-5 text-teal-400" />Sửa sản phẩm Shop SNKR</DialogTitle><DialogDescription>Đổi tên hoặc URL. Nếu đổi URL, hệ thống sẽ làm mới tên, hình, giá và lịch sử cũ của mục này.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2"><Field label="Tên hiển thị (tùy chọn)"><Input value={editForm.name} onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} placeholder="Tự lấy từ URL nếu để trống" /></Field><Field label="URL SNKRDUNK"><Input value={editForm.sourceUrl} onChange={(event) => setEditForm((current) => ({ ...current, sourceUrl: event.target.value }))} inputMode="url" /></Field><Field label="Loại sản phẩm"><Select value={editForm.productType} onValueChange={(value) => setEditForm((current) => ({ ...current, productType: value as ShopType }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="box">Box</SelectItem><SelectItem value="pack">Pack</SelectItem><SelectItem value="card">Card</SelectItem></SelectContent></Select></Field>{editItem && <ProductImageEditControls src={editItem.imageUrl} alt={editItem.name} zoom={editForm.imageZoom} position={{ x: editForm.imagePositionX, y: editForm.imagePositionY }} onZoomChange={(imageZoom) => setEditForm((current) => ({ ...current, imageZoom }))} onPositionChange={({ x, y }) => setEditForm((current) => ({ ...current, imagePositionX: x, imagePositionY: y }))} onReset={() => setEditForm((current) => ({ ...current, imageZoom: 1.12, imagePositionX: 0, imagePositionY: 0 }))} />}</div>
          <Button onClick={submitEdit} disabled={updateItem.isPending} className="w-full bg-teal-500 font-semibold text-slate-950 hover:bg-teal-400">{updateItem.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pencil className="mr-2 h-4 w-4" />}Lưu và cập nhật giá</Button>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteConfirmItem)} onOpenChange={(open) => !open && setDeleteConfirmItem(null)}>
        <AlertDialogContent className="max-w-[calc(100%-1rem)] border-border bg-card sm:max-w-md">
          <AlertDialogHeader><AlertDialogTitle>Xóa sản phẩm theo dõi?</AlertDialogTitle><AlertDialogDescription>Bạn sẽ ngừng theo dõi giá của <strong className="text-foreground">{deleteConfirmItem?.name}</strong>. Lịch sử giá riêng của mục này cũng sẽ bị xóa và không ảnh hưởng Kho Hàng hay dữ liệu tài chính.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={deleteItem.isPending}>Hủy</AlertDialogCancel><AlertDialogAction disabled={deleteItem.isPending} onClick={(event) => { event.preventDefault(); if (deleteConfirmItem) deleteItem.mutate({ id: deleteConfirmItem.id }); }} className="bg-red-600 text-white hover:bg-red-700">{deleteItem.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}Xóa theo dõi</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <HistoryDialog item={historyItem} history={(historyQuery.data ?? []) as PricePoint[]} loading={historyQuery.isLoading} days={historyDays} onDaysChange={setHistoryDays} onOpenChange={(open) => !open && setHistoryItem(null)} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1.5 text-sm font-medium text-foreground"><span>{label}</span>{children}</label>; }

function SummaryCard({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: "teal" | "green" | "amber" }) {
  const styles = { teal: "border-teal-500/35 bg-teal-950/30 text-teal-100", green: "border-emerald-500/35 bg-emerald-950/30 text-emerald-100", amber: "border-amber-500/35 bg-amber-950/30 text-amber-100" }[tone];
  return <Card className={styles}><CardContent className="p-3 sm:p-4"><div className="flex items-center gap-2 text-xs text-current/75">{icon}<span className="truncate">{label}</span></div><p className="mt-2 text-2xl font-black text-current">{value}</p></CardContent></Card>;
}

function EmptyWatchlist({ onAdd }: { onAdd: () => void }) { return <div className="rounded-2xl border border-dashed border-teal-500/30 bg-card/60 py-16 text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-300"><Box className="h-8 w-8" /></div><h2 className="mt-4 text-lg font-bold text-foreground">Chưa có sản phẩm theo dõi</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Thêm URL Box, Card hoặc Pack từ SNKRDUNK để tạo biểu đồ giá riêng, không ảnh hưởng dữ liệu kho hàng.</p><Button onClick={onAdd} className="mt-5 bg-teal-500 text-slate-950 hover:bg-teal-400"><Plus className="mr-2 h-4 w-4" />Thêm sản phẩm đầu tiên</Button></div>; }

function ShopGridCard({ item, sparklinePoints, onOpen, onSync, onEdit, onDelete, onWhiten, syncing, deleting, whitening }: { item: WatchItem; sparklinePoints?: SparklinePoint7d[]; onOpen: () => void; onSync: () => void; onEdit: () => void; onDelete: () => void; onWhiten: () => void; syncing: boolean; deleting: boolean; whitening: boolean }) {
  const price = Number(item.currentPrice) || 0;
  const displayName = item.sourceTitle || item.name;
  const customImageLabel = item.name.trim() !== (item.sourceTitle ?? "").trim() ? item.name.trim() : null;
  return <article role="button" tabIndex={0} onClick={onOpen} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen(); } }} className="group min-w-0 cursor-pointer rounded-2xl border border-border bg-card p-2.5 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:border-teal-400/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400">
    <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-white/90 bg-white p-0"><DirectProductImage item={item} /><span className="absolute left-2 top-2 rounded-full bg-slate-950/75 px-2 py-0.5 text-[10px] font-bold text-teal-100 backdrop-blur"><span className="rgb-action-label">{getTypeLabel(item.productType)}</span></span>{customImageLabel && <span className="absolute right-2 top-2 max-w-[62%] truncate rounded-full border border-white/10 bg-slate-950/80 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm backdrop-blur" title={customImageLabel}>{customImageLabel}</span>}</div>
    <div className="min-w-0 px-1 pt-3"><p className="line-clamp-2 min-h-10 break-words text-sm font-bold leading-5 text-foreground">{displayName}</p>{item.productType === "card" && <div className="mt-1"><RankBadge rank={item.cardRank} marketPrice={price} /></div>}<p className="mt-2 text-lg font-black tracking-tight text-teal-300">{price > 0 ? formatYen(price) : "Chưa có giá"}</p><MiniPriceSparkline points={sparklinePoints ?? []} /><div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground"><span>Theo dõi từ {new Date(item.createdAt).toLocaleDateString("vi-VN")}</span><span>{item.lastSyncedAt ? `Cập nhật ${new Date(item.lastSyncedAt).toLocaleDateString("vi-VN")}` : "Chờ đồng bộ"}</span></div>
      <div className="mt-2 flex gap-1.5 border-t border-border pt-2"><Button size="icon" onClick={(event) => { event.stopPropagation(); onSync(); }} disabled={syncing} className="h-7 w-7 bg-teal-500 text-slate-950 hover:bg-teal-400" aria-label={`Đồng bộ ${displayName}`}>{syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}</Button><Button size="icon" variant="outline" onClick={(event) => { event.stopPropagation(); onWhiten(); }} disabled={whitening} className="h-7 w-7 border-border bg-background" aria-label={`Tẩy nền đen thành trắng: ${displayName}`} title="Tẩy nền đen thành trắng">{whitening ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PaintBucket className="h-3.5 w-3.5" />}</Button><Button size="icon" variant="outline" onClick={(event) => { event.stopPropagation(); onEdit(); }} className="h-7 w-7 border-border bg-background" aria-label={`Sửa ${displayName}`}><Pencil className="h-3.5 w-3.5" /></Button><Button size="icon" variant="outline" onClick={(event) => { event.stopPropagation(); onDelete(); }} disabled={deleting} className="h-7 w-7 border-red-500/55 bg-red-950/35 text-red-300 hover:bg-red-600 hover:text-white" aria-label={`Xóa ${displayName}`}>{deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}</Button><Button size="icon" variant="outline" onClick={(event) => { event.stopPropagation(); void copySnkrdunkUrl(item.sourceUrl); }} className="h-7 w-7 border-teal-400/35 bg-teal-500/5 text-teal-100 hover:bg-teal-500/15" aria-label={`Sao chép URL SNKRDUNK của ${displayName}`} title="Sao chép URL SNKRDUNK"><Copy className="h-3.5 w-3.5" /></Button></div>
    </div>
  </article>;
}

function MiniPriceSparkline({ points }: { points: SparklinePoint7d[] }) {
  const values = points.map((point) => Number(point.price)).filter((value) => Number.isFinite(value) && value > 0);
  if (values.length < 2) return <div className="mt-2 rounded-md border border-dashed border-border/80 px-2 py-1.5 text-[10px] text-muted-foreground">7 ngày: đang thu thập dữ liệu</div>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const polyline = values.map((value, index) => `${(index / Math.max(1, values.length - 1)) * 100},${30 - ((value - min) / range) * 26}`).join(" ");
  const rising = values[values.length - 1] >= values[0];
  return <div className="mt-2 rounded-md border border-teal-400/20 bg-slate-950/35 px-1.5 py-1" title="Xu hướng giá thực tế trong 7 ngày gần nhất"><div className="flex items-center justify-between px-0.5 text-[9px] font-medium text-muted-foreground"><span>Xu hướng 7 ngày</span><span className={rising ? "text-emerald-300" : "text-red-300"}>{rising ? "Tăng" : "Giảm"}</span></div><svg viewBox="0 0 100 32" preserveAspectRatio="none" className="mt-0.5 h-8 w-full" role="img" aria-label="Biểu đồ giá bảy ngày"><polyline points={polyline} fill="none" stroke={rising ? "#2dd4bf" : "#fb7185"} strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" /></svg></div>;
}

function WatchItemCard({ item, onSync, onOpenHistory, onEdit, onDelete, syncing, deleting }: { item: WatchItem; onSync: () => void; onOpenHistory: () => void; onEdit: () => void; onDelete: () => void; syncing: boolean; deleting: boolean }) {
  const price = Number(item.currentPrice) || 0;
  const displayName = item.sourceTitle || item.name;
  return <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
    <div className="grid min-w-0 grid-cols-[112px_minmax(0,1fr)] border-b border-border bg-gradient-to-r from-teal-500/10 via-transparent to-transparent">
      <div className="flex aspect-square items-center justify-center overflow-hidden border-r border-white bg-white p-0">
        <DirectProductImage item={item} />
      </div>
      <div className="min-w-0 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-1.5"><h2 className="min-w-0 break-words text-base font-bold leading-6 text-foreground">{displayName}</h2>{item.productType === "card" && <RankBadge rank={item.cardRank} marketPrice={price} />}</div><div className="mt-1 flex flex-wrap gap-1.5"><Badge variant="outline" className="border-teal-500/30 bg-teal-500/10 text-teal-200">{getTypeLabel(item.productType)}</Badge>{item.lastSyncedAt ? <span className="text-xs text-muted-foreground">Cập nhật {new Date(item.lastSyncedAt).toLocaleString("vi-VN")}</span> : <span className="text-xs text-amber-300">Chưa lấy giá</span>}</div></div><a href={item.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Mở SNKRDUNK cho ${displayName}`} className="shrink-0 rounded-lg p-2 text-teal-300 transition-colors hover:bg-teal-500/10"><ExternalLink className="h-4 w-4" /></a></div></div>
    </div>
    <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto]"><div><p className="text-xs text-muted-foreground">Giá SNKRDUNK hiện tại</p><p className="mt-1 text-3xl font-black tracking-tight text-teal-300">{price > 0 ? formatYen(price) : "—"}</p><p className="mt-1 text-xs text-muted-foreground">Theo dõi độc lập · không tính vào Kho Hàng</p>{item.lastSyncError && <p className="mt-2 text-xs leading-5 text-red-300">Lỗi đồng bộ: {item.lastSyncError}</p>}</div><div className="flex flex-wrap items-end gap-2 sm:justify-end"><Button size="sm" variant="outline" onClick={onOpenHistory} className="border-border bg-background text-xs"><BarChart3 className="mr-1.5 h-3.5 w-3.5" />Lịch sử</Button><Button size="sm" variant="outline" onClick={onEdit} className="border-border bg-background text-xs"><Pencil className="mr-1.5 h-3.5 w-3.5" />Sửa</Button><Button size="sm" onClick={onSync} disabled={syncing} className="bg-teal-500 text-xs text-slate-950 hover:bg-teal-400">{syncing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}Cập nhật</Button><Button size="icon" variant="ghost" onClick={onDelete} disabled={deleting} className="h-8 w-8 text-muted-foreground hover:bg-red-500/10 hover:text-red-400" aria-label={`Xóa ${displayName}`}><Trash2 className="h-4 w-4" /></Button></div></div>
  </article>;
}

function DirectProductImage({ item }: { item: WatchItem }) {
  return <ProductImageAdjuster entity="snkr" id={item.id} kind={item.productType === "card" ? "card" : "box-pack"} src={item.imageUrl} initialZoom={item.imageZoom} initialPositionX={item.imagePositionX} initialPositionY={item.imagePositionY} alt={item.imageUrl ? item.sourceTitle || item.name : `${item.name} — chưa có ảnh`} className="absolute inset-0 rounded-xl" eager referrerPolicy="no-referrer" />;
}

function HistoryDialog({ item, history, loading, days, onDaysChange, onOpenChange }: { item: WatchItem | null; history: PricePoint[]; loading: boolean; days: 7 | 30 | 90; onDaysChange: (days: 7 | 30 | 90) => void; onOpenChange: (open: boolean) => void }) {
  const chartData = useMemo(() => history.map((point) => ({ price: Number(point.price) || 0, date: new Date(point.createdAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) })), [history]);
  return <Dialog open={Boolean(item)} onOpenChange={onOpenChange}><DialogContent className="max-h-[calc(100dvh-1rem)] max-w-[calc(100%-1rem)] overflow-y-auto border-border bg-card p-4 sm:max-w-3xl sm:p-6"><DialogHeader><DialogTitle className="flex items-center gap-2 text-foreground"><BarChart3 className="h-5 w-5 text-teal-300" />Lịch sử giá Shop SNKR</DialogTitle><DialogDescription className="break-words">{item?.name}</DialogDescription></DialogHeader><div className="mt-2 flex flex-wrap gap-2">{([7, 30, 90] as const).map((value) => <Button key={value} size="sm" variant={days === value ? "default" : "outline"} onClick={() => onDaysChange(value)} className={days === value ? "bg-teal-500 text-slate-950 hover:bg-teal-400" : ""}>{value} ngày</Button>)}</div>{loading ? <div className="flex h-60 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-teal-300" /></div> : history.length === 0 ? <div className="rounded-xl border border-dashed border-border py-14 text-center text-sm text-muted-foreground">Chưa có biến động giá. Hệ thống sẽ ghi nhận khi giá SNKRDUNK thay đổi.</div> : <div className="space-y-3"><ChartContainer config={priceChartConfig} className="mt-3 h-[230px] w-full sm:h-[280px]"><LineChart data={chartData} margin={{ top: 12, right: 8, left: -8, bottom: 0 }}><CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="date" tickLine={false} axisLine={false} /><YAxis tickLine={false} axisLine={false} width={56} tickFormatter={(value) => formatYen(Number(value))} /><ChartTooltip content={<ChartTooltipContent hideLabel formatter={(value) => formatYen(Number(value))} />} /><Line type="monotone" dataKey="price" stroke="var(--color-price)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--color-price)" }} activeDot={{ r: 5 }} /></LineChart></ChartContainer><div className="max-h-32 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-background/60">{[...history].reverse().map((point) => <div key={point.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs"><span className="text-muted-foreground">{new Date(point.createdAt).toLocaleString("vi-VN")}</span><strong className="text-teal-200">{formatYen(Number(point.price))}</strong></div>)}</div></div>}</DialogContent></Dialog>;
}
