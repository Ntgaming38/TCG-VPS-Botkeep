import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  ArchiveRestore,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  ExternalLink,
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  Store,
  Ticket,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { Link } from "wouter";

type HistoryFilter = "all" | "auto_sync" | "product" | "purchase" | "sale" | "shop" | "chyusen";

const fieldLabels: Record<string, string> = {
  name: "Tên", type: "Loại", quantity: "Số lượng", damagedQuantity: "Số lượng hỏng",
  buyPrice: "Giá nhập", marketPrice: "Giá thị trường", sellPrice: "Giá bán",
  totalPrice: "Tổng tiền mua", totalRevenue: "Tổng doanh thu", salePrice: "Giá bán",
  profit: "Lợi nhuận", shop: "Cửa hàng", note: "Ghi chú", status: "Trạng thái",
  damageNote: "Ghi chú hàng hỏng", platform: "Nền tảng", condition: "Rank Card",
  productName: "Tên sản phẩm", series: "Series", applicationStatus: "Trạng thái đăng ký", resultStatus: "Kết quả",
  applicationEnd: "Hạn đăng ký", resultDate: "Ngày công bố", purchaseCreatedAt: "Đã chuyển Mua Hàng",
};

const filters: Array<{ value: HistoryFilter; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "auto_sync", label: "Đồng Bộ" },
  { value: "product", label: "Kho hàng" },
  { value: "purchase", label: "Mua hàng" },
  { value: "sale", label: "Bán hàng" },
  { value: "chyusen", label: "Chyusen" },
  { value: "shop", label: "Cửa hàng" },
];

export function getActivityTone(action: string, entityType: string | null) {
  if (action === "chyusen_restored") return { label: "Đã khôi phục", icon: ArchiveRestore, badgeClass: "border-cyan-400/40 bg-cyan-500/15 text-cyan-300", buttonClass: "border-cyan-400 bg-cyan-400 text-black hover:bg-cyan-300", accentClass: "border-cyan-400/60", fieldClass: "bg-cyan-500/10 text-cyan-200", valueClass: "bg-cyan-500/5 text-cyan-100" };
  if (action === "chyusen_purchase_linked") return { label: "Đã mua", icon: ShoppingBag, badgeClass: "border-emerald-400/40 bg-emerald-500/15 text-emerald-300", buttonClass: "border-emerald-400 bg-emerald-400 text-black hover:bg-emerald-300", accentClass: "border-emerald-400/60", fieldClass: "bg-emerald-500/10 text-emerald-200", valueClass: "bg-emerald-500/5 text-emerald-100" };
  if (action.endsWith("_deleted")) return { label: "Đã xóa", icon: Trash2, badgeClass: "border-rose-400/40 bg-rose-500/15 text-rose-300", buttonClass: "border-rose-400 bg-rose-400 text-black hover:bg-rose-300", accentClass: "border-rose-400/60", fieldClass: "bg-rose-500/10 text-rose-200", valueClass: "bg-rose-500/5 text-rose-100" };
  if (action.endsWith("_updated") || action === "market_price_updated" || action === "snkrdunk_url_updated") return { label: "Đã sửa", icon: Pencil, badgeClass: "border-orange-400/40 bg-orange-500/15 text-orange-300", buttonClass: "border-orange-400 bg-orange-400 text-black hover:bg-orange-300", accentClass: "border-orange-400/60", fieldClass: "bg-orange-500/10 text-orange-200", valueClass: "bg-orange-500/5 text-orange-100" };
  if (entityType === "purchase") return { label: "Đã mua", icon: ShoppingBag, badgeClass: "border-emerald-400/40 bg-emerald-500/15 text-emerald-300", buttonClass: "border-emerald-400 bg-emerald-400 text-black hover:bg-emerald-300", accentClass: "border-emerald-400/60", fieldClass: "bg-emerald-500/10 text-emerald-200", valueClass: "bg-emerald-500/5 text-emerald-100" };
  if (entityType === "sale") return { label: "Đã bán", icon: TrendingUp, badgeClass: "border-yellow-400/40 bg-yellow-500/15 text-yellow-300", buttonClass: "border-yellow-400 bg-yellow-400 text-black hover:bg-yellow-300", accentClass: "border-yellow-400/60", fieldClass: "bg-yellow-500/10 text-yellow-200", valueClass: "bg-yellow-500/5 text-yellow-100" };
  if (action.endsWith("_created")) return { label: "Đã thêm", icon: Plus, badgeClass: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300", buttonClass: "border-emerald-400 bg-emerald-400 text-black hover:bg-emerald-300", accentClass: "border-emerald-400/50", fieldClass: "bg-emerald-500/10 text-emerald-200", valueClass: "bg-emerald-500/5 text-emerald-100" };
  if (action === "product_damaged") return { label: "Hàng hỏng", icon: ArchiveRestore, badgeClass: "border-amber-400/30 bg-amber-400/10 text-amber-300", buttonClass: "border-amber-400 bg-amber-400 text-black hover:bg-amber-300", accentClass: "border-amber-400/50", fieldClass: "bg-amber-500/10 text-amber-200", valueClass: "bg-amber-500/5 text-amber-100" };
  if (action.includes("synced")) return { label: "Đã đồng bộ", icon: TrendingUp, badgeClass: "border-violet-400/30 bg-violet-400/10 text-violet-300", buttonClass: "border-violet-400 bg-violet-400 text-black hover:bg-violet-300", accentClass: "border-violet-400/50", fieldClass: "bg-violet-500/10 text-violet-200", valueClass: "bg-violet-500/5 text-violet-100" };
  return { label: "Hoạt động", icon: Activity, badgeClass: "border-primary/30 bg-primary/10 text-primary", buttonClass: "border-primary bg-primary text-black hover:bg-primary/80", accentClass: "border-primary/50", fieldClass: "bg-primary/10 text-primary", valueClass: "bg-primary/5 text-foreground" };
}

export function isAutoSyncActivity(action: string) {
  return action === "snkrdunk_price_synced" || action.startsWith("snkr_shop_") && action.includes("sync") || (action.includes("snkrdunk") && action.includes("synced"));
}

export function getSyncActivityDetails(action: string, newValue: string | null) {
  const parsed = parseChangeValue(newValue);
  const isShopSnkr = action.startsWith("snkr_shop_");
  const syncMode = parsed.syncMode === "auto" || action.includes("_auto_") ? "auto" : parsed.syncMode === "manual" || action.includes("_manual_") ? "manual" : null;
  const totalCount = Number(parsed.totalCount);
  const syncedCount = Number(parsed.syncedCount);
  const failedCount = Number(parsed.failedCount);
  return {
    isShopSnkr,
    syncMode,
    summary: Number.isFinite(totalCount) && Number.isFinite(syncedCount) && Number.isFinite(failedCount)
      ? { totalCount, syncedCount, failedCount }
      : null,
  };
}

function getEntityIcon(entityType: string | null) {
  if (entityType === "chyusen") return Ticket;
  if (entityType === "purchase") return ShoppingBag;
  if (entityType === "sale") return TrendingUp;
  if (entityType === "shop") return Store;
  return Package;
}

function formatActivityTime(value: Date | string) {
  return new Date(value).toLocaleString("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function parseChangeValue(value: string | null) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function formatChangeValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Có" : "Không";
  return String(value);
}

export function getChangedFields(oldValue: string | null, newValue: string | null) {
  const before = parseChangeValue(oldValue);
  const after = parseChangeValue(newValue);
  return Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
    .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .slice(0, 12)
    .map((key) => ({ key, before: before[key], after: after[key] }));
}

function getInitialExpandedActivityId() {
  const value = new URLSearchParams(window.location.search).get("expand");
  const id = value ? Number(value) : NaN;
  return Number.isInteger(id) && id > 0 ? id : null;
}

export default function ActivityHistory() {
  const [activeFilter, setActiveFilter] = useState<HistoryFilter>("all");
  const [search, setSearch] = useState("");
  const [expandedActivityId, setExpandedActivityId] = useState<number | null>(getInitialExpandedActivityId);
  const queryInput = useMemo(() => ({
    entityType: activeFilter === "all" || activeFilter === "auto_sync" ? undefined : activeFilter,
    syncScope: activeFilter === "auto_sync" ? "only" as const : activeFilter === "all" ? "exclude" as const : undefined,
    search: search.trim() || undefined,
    limit: 25,
  }), [activeFilter, search]);
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = trpc.activities.list.useInfiniteQuery(queryInput, {
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
  const activities = data?.pages.flatMap((page) => page.items) ?? [];
  const totalCount = data?.pages[0]?.totalCount ?? activities.length;
  const hasTotalBeyondLoaded = totalCount > activities.length;
  const visibleActivities = useMemo(() => activities.filter((item) => {
    if (activeFilter === "auto_sync") return isAutoSyncActivity(item.action);
    if (activeFilter === "all") return !isAutoSyncActivity(item.action);
    return true;
  }), [activities, activeFilter]);

  const additions = visibleActivities.filter((item) => item.action.endsWith("_created")).length;
  const updates = visibleActivities.filter((item) => item.action.endsWith("_updated") || item.action === "market_price_updated" || item.action === "snkrdunk_url_updated").length;
  const deletions = visibleActivities.filter((item) => item.action.endsWith("_deleted")).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Lịch Sử Hoạt Động</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Theo dõi các thao tác thêm, sửa, xóa và cập nhật dữ liệu trong tài khoản của bạn.</p>
        </div>
        <Badge variant="outline" className="w-fit border-primary/30 bg-primary/10 px-3 py-1.5 text-primary">
          {visibleActivities.length > 0 ? `Đã tải ${visibleActivities.length}${hasTotalBeyondLoaded ? `/${totalCount}` : ""} hoạt động` : "Chưa có hoạt động"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="bg-card neon-card"><CardContent className="flex items-center gap-3 p-4"><div className="rounded-lg bg-emerald-500/10 p-2"><Plus className="h-4 w-4 text-emerald-300" /></div><div><p className="text-xs text-muted-foreground">Đã thêm</p><p className="text-xl font-bold">{additions}</p></div></CardContent></Card>
        <Card className="bg-card neon-card"><CardContent className="flex items-center gap-3 p-4"><div className="rounded-lg bg-sky-500/10 p-2"><Pencil className="h-4 w-4 text-sky-300" /></div><div><p className="text-xs text-muted-foreground">Đã cập nhật</p><p className="text-xl font-bold">{updates}</p></div></CardContent></Card>
        <Card className="bg-card neon-card"><CardContent className="flex items-center gap-3 p-4"><div className="rounded-lg bg-rose-500/10 p-2"><Trash2 className="h-4 w-4 text-rose-300" /></div><div><p className="text-xs text-muted-foreground">Đã xóa</p><p className="text-xl font-bold">{deletions}</p></div></CardContent></Card>
      </div>

      <Card className="bg-card neon-card">
        <CardHeader className="gap-4 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base font-semibold">Nhật ký sử dụng</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo nội dung..." className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2" aria-label="Lọc lịch sử theo nhóm dữ liệu">
            {filters.map((filter) => (
              <Button key={filter.value} size="sm" variant={activeFilter === filter.value ? "default" : "outline"} onClick={() => setActiveFilter(filter.value)}>
                {filter.label}
              </Button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Đang tải lịch sử...</div>
          ) : isError ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center"><p className="text-sm text-muted-foreground">Không thể tải lịch sử hoạt động. Vui lòng thử lại.</p><Button variant="outline" size="sm" onClick={() => refetch()}>Tải lại</Button></div>
          ) : visibleActivities.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center"><div className="rounded-full bg-secondary/60 p-3"><CheckCircle2 className="h-5 w-5 text-muted-foreground" /></div><div><p className="text-sm font-medium">Chưa có hoạt động phù hợp</p><p className="mt-1 text-xs text-muted-foreground">Các thao tác thêm, sửa, xóa và cập nhật sẽ được lưu tại đây.</p></div></div>
          ) : (
            <>
              <div className="divide-y divide-border/60 rounded-xl border border-border/60 bg-secondary/10">
              {visibleActivities.map((item) => {
                const tone = getActivityTone(item.action, item.entityType);
                const ActionIcon = tone.icon;
                const EntityIcon = getEntityIcon(item.entityType);
                const changes = getChangedFields(item.oldValue, item.newValue);
                const isExpanded = expandedActivityId === item.id;
                const syncDetails = getSyncActivityDetails(item.action, item.newValue);
                return (
                  <div key={item.id} className="transition-colors hover:bg-secondary/40">
                    <div className="flex items-start gap-3 px-4 py-3.5">
                      <div className="mt-0.5 rounded-lg bg-background p-2 shadow-sm"><EntityIcon className="h-4 w-4 text-primary" /></div>
                      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="min-w-0 text-sm font-medium leading-5 text-foreground">{item.description || "Hoạt động trong hệ thống"}</p><Badge variant="outline" className={`inline-flex shrink-0 items-center gap-1 ${tone.buttonClass}`}><ActionIcon className="h-3 w-3" />{tone.label}</Badge>{syncDetails.syncMode && <Badge variant="outline" className={syncDetails.syncMode === "auto" ? "border-violet-400/40 bg-violet-500/15 text-violet-200" : "border-sky-400/40 bg-sky-500/15 text-sky-200"}>{syncDetails.syncMode === "auto" ? "Tự động" : "Thủ công"}</Badge>}</div>{syncDetails.summary && <p className="mt-1 text-xs text-muted-foreground">Thành công {syncDetails.summary.syncedCount}/{syncDetails.summary.totalCount} · Lỗi {syncDetails.summary.failedCount}</p>}<p className="mt-1 text-xs text-muted-foreground">{formatActivityTime(item.createdAt)}</p></div>
                      <div className="flex shrink-0 items-center gap-2">
                        {syncDetails.isShopSnkr && item.entityType === "snkr_shop_item" && item.entityId && <Link href={`/shop-snkr/${item.entityId}`} className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs text-primary transition-colors hover:bg-primary/10 hover:text-primary"><span className="hidden md:inline">Mở</span><ExternalLink className="h-3.5 w-3.5" /></Link>}
                        {changes.length > 0 && <Button variant="ghost" size="sm" onClick={() => setExpandedActivityId(isExpanded ? null : item.id)} className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"><span className="hidden md:inline">Chi tiết</span>{isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}</Button>}
                      </div>
                    </div>
                    {isExpanded && changes.length > 0 && (
                      <div className={`mx-4 mb-4 overflow-hidden rounded-lg border-l-4 border border-border/60 bg-background/60 ${tone.accentClass}`}>
                        <div className="flex items-center justify-between border-b border-border/60 bg-secondary/30 px-3 py-2"><span className="text-xs font-medium text-muted-foreground">Các trường đã thay đổi</span><Badge variant="outline" className={`h-6 gap-1 text-[11px] ${tone.badgeClass}`}><ActionIcon className="h-3 w-3" />{tone.label}</Badge></div>
                        <div className="grid grid-cols-[minmax(90px,0.8fr)_1fr_1fr] gap-px bg-border/60 text-xs">
                          <div className="bg-secondary/40 px-3 py-2 font-medium text-muted-foreground">Trường</div><div className="bg-secondary/40 px-3 py-2 font-medium text-muted-foreground">Trước</div><div className="bg-secondary/40 px-3 py-2 font-medium text-muted-foreground">Sau</div>
                          {changes.map((change) => <Fragment key={change.key}><div className={`border-l-2 bg-background px-3 py-2 font-semibold ${tone.accentClass} ${tone.fieldClass}`}>{fieldLabels[change.key] || change.key}</div><div className={`break-words bg-background px-3 py-2 text-muted-foreground ${tone.valueClass}`}>{formatChangeValue(change.before)}</div><div className={`break-words bg-background px-3 py-2 font-medium ${tone.valueClass}`}>{formatChangeValue(change.after)}</div></Fragment>)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
              {hasNextPage && (
                <div className="flex flex-col items-center gap-2 pt-1">
                  <p className="text-xs text-muted-foreground">Đã tải {visibleActivities.length}{hasTotalBeyondLoaded ? `/${totalCount}` : ""} hoạt động</p>
                  <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="min-w-48 gap-2">
                    {isFetchingNextPage ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang tải thêm...</> : "Tải thêm lịch sử"}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
