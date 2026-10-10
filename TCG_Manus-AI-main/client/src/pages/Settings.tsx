import { useState } from "react";
import { BellRing, ChevronDown, ChevronUp, CircleAlert, CircleCheck, PackageSearch, Radio, RefreshCw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { createChyusenSourceUpdatePayload } from "@shared/chyusenSourceUpdate";
import { marketplaceAutoSyncStatusLabel } from "@shared/marketplaceAutoSync";

const INTERVALS = [{ value: "60", label: "1 giờ" }, { value: "180", label: "3 giờ" }, { value: "360", label: "6 giờ" }, { value: "720", label: "12 giờ" }, { value: "1440", label: "24 giờ" }] as const;
const BATCH_SIZES = [6, 12, 18, 20] as const;
type SourceDraft = { label: string; sourceUrl: string; checkIntervalMinutes: string; isActive: boolean };
type SourceFilter = "all" | "errors";

function statusStyle(status?: string | null) {
  if (status === "unavailable") return "border-red-200 bg-red-50 text-red-700";
  if (status === "detected") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export default function Settings() {
  const utils = trpc.useUtils();
  const { data: notificationSettings } = trpc.chyusen.notificationSettings.useQuery();
  const { data: sources = [] } = trpc.chyusen.sources.useQuery();
  const { data: autoSyncStatus } = trpc.products.autoSyncStatus.useQuery();
  const [sourceDrafts, setSourceDrafts] = useState<Record<number, SourceDraft>>({});
  const [deleteSourceId, setDeleteSourceId] = useState<number | null>(null);
  const [newSource, setNewSource] = useState({ label: "", sourceUrl: "", checkIntervalMinutes: "360" });
  const [sourcesExpanded, setSourcesExpanded] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

  const updateSettings = trpc.chyusen.updateNotificationSettings.useMutation({ onSuccess: () => { utils.chyusen.notificationSettings.invalidate(); toast.success("Đã cập nhật cài đặt nhắc hạn."); } });
  const updateSource = trpc.chyusen.updateSource.useMutation({ onSuccess: () => { utils.chyusen.sources.invalidate(); toast.success("Đã lưu thay đổi nguồn theo dõi."); } });
  const deleteSource = trpc.chyusen.deleteSource.useMutation({ onSuccess: () => { setDeleteSourceId(null); setSourceDrafts({}); utils.chyusen.sources.invalidate(); toast.success("Đã xóa nguồn theo dõi."); } });
  const createSource = trpc.chyusen.createSource.useMutation({ onSuccess: () => { setNewSource({ label: "", sourceUrl: "", checkIntervalMinutes: "360" }); utils.chyusen.sources.invalidate(); toast.success("Đã thêm nguồn theo dõi."); } });
  const checkSourceNow = trpc.chyusen.checkSourceNow.useMutation({
    onSuccess: (result) => { utils.chyusen.sources.invalidate(); utils.chyusen.sourceHistory.invalidate(); toast[result.unavailable ? "error" : "success"](result.unavailable ? `Không thể kiểm tra nguồn: ${result.latestError || "lỗi không xác định"}` : result.changed ? "Đã kiểm tra: phát hiện nội dung nguồn thay đổi." : "Đã kiểm tra: nguồn hiện không có thay đổi."); },
    onError: (error) => toast.error(error.message || "Không thể kiểm tra nguồn ngay bây giờ."),
  });
  const updateAutoSync = trpc.products.updateAutoSyncSettings.useMutation({ onSuccess: () => { utils.products.autoSyncStatus.invalidate(); toast.success("Đã lưu cấu hình đồng bộ Marketplace."); }, onError: (error) => toast.error(error.message || "Không thể lưu cấu hình Marketplace.") });
  const syncMarketplaceNow = trpc.products.syncAllSnkrdunk.useMutation({
    onSuccess: (result) => {
      utils.products.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.reports.overview.invalidate();
      utils.products.autoSyncStatus.invalidate();
      toast.success(`Đã đồng bộ ${result.updatedCount} sản phẩm${result.errors.length ? `; ${result.errors.length} sản phẩm chưa cập nhật được` : ""}.`);
    },
    onError: (error) => toast.error(error.message || "Không thể đồng bộ Marketplace ngay bây giờ."),
  });

  const deadlineHours = notificationSettings?.deadlineHours || [168, 72, 24, 12, 3, 1];
  const failedSources = sources.filter((source: any) => source.latestStatus === "unavailable");
  const visibleSources = sourceFilter === "errors" ? failedSources : sources;
  const sourceDraft = (source: any): SourceDraft => sourceDrafts[source.id] || { label: source.label || "", sourceUrl: source.sourceUrl || "", checkIntervalMinutes: String(source.checkIntervalMinutes || 360), isActive: Boolean(source.isActive) };
  const updateDraft = (source: any, patch: Partial<SourceDraft>) => setSourceDrafts((current) => ({ ...current, [source.id]: { ...sourceDraft(source), ...patch } }));
  const saveSource = (source: any) => {
    try {
      updateSource.mutate(createChyusenSourceUpdatePayload(source.id, sourceDraft(source)), { onSuccess: () => setSourceDrafts((current) => { const next = { ...current }; delete next[source.id]; return next; }) });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu nguồn theo dõi.");
    }
  };

  return <div className="settings-stack mx-auto max-w-5xl">
    <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-red-600">Workspace settings</p><h1 className="mt-1 text-3xl font-black tracking-tight">Cài đặt</h1><p className="mt-1 text-sm text-muted-foreground">Quản lý nhắc hạn, nguồn Chyusen và tự động đồng bộ giá ở một nơi.</p></div>

    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><BellRing className="h-5 w-5 text-red-600" />Nhắc hạn Chyusen</CardTitle><CardDescription>Chọn các mốc nhắc áp dụng riêng cho tài khoản của bạn.</CardDescription></CardHeader>
      <CardContent className="space-y-5"><div className="flex flex-wrap gap-2">{[168, 72, 24, 12, 3, 1].map((hour) => { const selected = deadlineHours.includes(hour); return <Button key={hour} variant={selected ? "default" : "outline"} size="sm" className={selected ? "bg-red-600 hover:bg-red-700" : ""} onClick={() => updateSettings.mutate({ deadlineHours: selected ? deadlineHours.filter((value: number) => value !== hour) : [...deadlineHours, hour] })}>{hour >= 24 ? `${hour / 24} ngày` : `${hour} giờ`}</Button>; })}</div><div className="grid gap-3 border-t pt-4 sm:grid-cols-2">{[["lotteryNew", "Chyusen mới"], ["lotteryExpiring", "Sắp hết hạn"], ["lotteryResult", "Ngày công bố"], ["lotteryChanged", "Nguồn thay đổi"]].map(([key, label]) => <div key={key} className="flex items-center justify-between rounded-lg border p-3"><span className="text-sm font-medium">{label}</span><Switch checked={notificationSettings ? Boolean((notificationSettings as any)[key]) : true} onCheckedChange={(checked) => updateSettings.mutate({ [key]: checked })} /></div>)}</div></CardContent>
    </Card>

    <Card>
      <CardHeader className="gap-3 sm:flex sm:flex-row sm:items-start sm:justify-between"><div><CardTitle className="flex items-center gap-2"><Radio className="h-5 w-5 text-red-600" />Nguồn theo dõi</CardTitle><CardDescription className="mt-1">Thu gọn danh sách khi không cần chỉnh sửa; dùng bộ lọc để xem nhanh nguồn lỗi.</CardDescription></div><div className="flex flex-wrap gap-2"><Button size="sm" variant={sourceFilter === "errors" ? "default" : "outline"} className={sourceFilter === "errors" ? "bg-red-600 hover:bg-red-700" : ""} onClick={() => setSourceFilter((current) => current === "errors" ? "all" : "errors")}><CircleAlert className="mr-1.5 h-3.5 w-3.5" />{sourceFilter === "errors" ? "Đang lọc lỗi" : `Nguồn lỗi (${failedSources.length})`}</Button><Button size="sm" variant="outline" onClick={() => setSourcesExpanded((current) => !current)} aria-expanded={sourcesExpanded}>{sourcesExpanded ? <ChevronUp className="mr-1.5 h-3.5 w-3.5" /> : <ChevronDown className="mr-1.5 h-3.5 w-3.5" />}{sourcesExpanded ? "Thu gọn" : `Mở rộng (${visibleSources.length})`}</Button></div></CardHeader>
      <Collapsible open={sourcesExpanded} onOpenChange={setSourcesExpanded}><CollapsibleContent><CardContent className="space-y-3">{visibleSources.length === 0 ? <div className="rounded-lg border border-dashed px-4 py-7 text-center"><CircleAlert className="mx-auto mb-2 h-5 w-5 text-muted-foreground" /><p className="text-sm font-semibold">Không có nguồn đang lỗi</p><p className="mt-1 text-xs text-muted-foreground">Đổi bộ lọc để xem tất cả nguồn theo dõi.</p></div> : visibleSources.map((source: any) => { const draft = sourceDraft(source); const hasError = source.latestStatus === "unavailable"; return <div key={source.id} className="space-y-3 rounded-lg border p-3"><div className="grid gap-3 md:grid-cols-[1fr_1.5fr_110px_auto]"><Input value={draft.label} onChange={(event) => updateDraft(source, { label: event.target.value })} placeholder="Tên nguồn" /><Input value={draft.sourceUrl} onChange={(event) => updateDraft(source, { sourceUrl: event.target.value })} placeholder="URL công khai" /><Select value={draft.checkIntervalMinutes} onValueChange={(value) => updateDraft(source, { checkIntervalMinutes: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{INTERVALS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select><div className="flex items-center gap-2"><Switch checked={draft.isActive} onCheckedChange={(checked) => updateDraft(source, { isActive: checked })} /><span className="text-xs text-muted-foreground">{draft.isActive ? "Bật" : "Tắt"}</span></div></div><div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3"><div className="flex flex-wrap items-center gap-2 text-xs"><span className={`rounded-full border px-2 py-0.5 font-semibold ${statusStyle(source.latestStatus)}`}>{source.latestStatus === "unavailable" ? "Không truy cập được" : source.latestStatus === "detected" ? "Có thay đổi" : "Hoạt động bình thường"}</span><span className="text-muted-foreground">Kiểm tra gần nhất: {source.lastCheckedAt ? new Date(source.lastCheckedAt).toLocaleString("vi-VN") : "Chưa có"}</span>{hasError && <span className="inline-flex items-center gap-1 text-red-700"><CircleAlert className="h-3.5 w-3.5" />{source.latestError || "Lỗi không xác định"}</span>}</div><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={checkSourceNow.isPending} onClick={() => checkSourceNow.mutate({ id: source.id })}><RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${checkSourceNow.isPending ? "animate-spin" : ""}`} />{checkSourceNow.isPending ? "Đang kiểm tra" : "Kiểm tra ngay"}</Button><Button variant="outline" size="sm" disabled={updateSource.isPending} onClick={() => saveSource(source)}><Save className="mr-1.5 h-3.5 w-3.5" />{updateSource.isPending ? "Đang lưu" : "Lưu"}</Button><Button variant="outline" size="sm" className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800" onClick={() => setDeleteSourceId(source.id)}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Xóa</Button></div></div></div>; })}<div className="grid gap-3 rounded-lg border border-dashed p-3 md:grid-cols-[1fr_1.5fr_110px_auto]"><Input value={newSource.label} onChange={(e) => setNewSource({ ...newSource, label: e.target.value })} placeholder="Tên nguồn mới" /><Input value={newSource.sourceUrl} onChange={(e) => setNewSource({ ...newSource, sourceUrl: e.target.value })} placeholder="https://..." /><Select value={newSource.checkIntervalMinutes} onValueChange={(value) => setNewSource({ ...newSource, checkIntervalMinutes: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{INTERVALS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select><Button disabled={!newSource.sourceUrl || createSource.isPending} className="bg-red-600 hover:bg-red-700" onClick={() => createSource.mutate({ label: newSource.label, sourceUrl: newSource.sourceUrl, checkIntervalMinutes: Number(newSource.checkIntervalMinutes) as 60 | 180 | 360 | 720 | 1440 })}>{createSource.isPending ? "Đang lưu" : "Thêm nguồn"}</Button></div></CardContent></CollapsibleContent></Collapsible>
    </Card>

    <Card>
      <CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><PackageSearch className="h-5 w-5 text-red-600" />Đồng bộ giá Marketplace</CardTitle><CardDescription className="mt-1">Tự động đồng bộ SNKRDUNK mỗi 6 giờ. Bạn có thể chạy thủ công theo yêu cầu bất cứ lúc nào.</CardDescription></div><Button className="bg-red-600 hover:bg-red-700" disabled={syncMarketplaceNow.isPending} onClick={() => syncMarketplaceNow.mutate()}><RefreshCw className={`mr-1.5 h-4 w-4 ${syncMarketplaceNow.isPending ? "animate-spin" : ""}`} />{syncMarketplaceNow.isPending ? "Đang đồng bộ" : "Đồng bộ ngay"}</Button></div></CardHeader>
      <CardContent className="space-y-4"><div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_auto]"><div><p className="text-sm font-semibold">Đồng bộ tự động</p><p className="text-xs text-muted-foreground">Tối đa {autoSyncStatus?.batchSize || 12} sản phẩm/lần, giữ nguyên giá cũ nếu nguồn không trả giá hợp lệ.</p></div><div className="flex items-center gap-2"><Switch checked={Boolean(autoSyncStatus?.isEnabled)} disabled={!autoSyncStatus || updateAutoSync.isPending} onCheckedChange={(isEnabled) => updateAutoSync.mutate({ isEnabled })} /><span className="text-xs font-medium">{autoSyncStatus?.isEnabled ? "Đang bật" : "Đang tắt"}</span></div></div><div className="grid gap-3 sm:grid-cols-2"><div><p className="mb-2 text-xs font-semibold text-muted-foreground">Kích thước lô tự động</p><Select value={String(autoSyncStatus?.batchSize || 12)} onValueChange={(value) => updateAutoSync.mutate({ batchSize: Number(value) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{BATCH_SIZES.map((size) => <SelectItem key={size} value={String(size)}>{size} sản phẩm / lần</SelectItem>)}</SelectContent></Select></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Lần chạy tự động gần nhất</p><p className="mt-1 flex items-center gap-1 text-sm font-semibold"><CircleCheck className="h-4 w-4 text-emerald-600" />{autoSyncStatus?.lastRunStatus ? marketplaceAutoSyncStatusLabel(autoSyncStatus.lastRunStatus) : "Chưa chạy"}</p><p className="mt-1 text-xs text-muted-foreground">{autoSyncStatus?.lastRunAt ? new Date(autoSyncStatus.lastRunAt).toLocaleString("vi-VN") : "Lịch nền đã sẵn sàng"}</p></div></div>{autoSyncStatus?.lastRunSummary && <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">{autoSyncStatus.lastRunSummary}</p>}</CardContent>
    </Card>

    <AlertDialog open={deleteSourceId !== null} onOpenChange={(open) => !open && setDeleteSourceId(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xóa nguồn theo dõi?</AlertDialogTitle><AlertDialogDescription>Nguồn sẽ không còn được kiểm tra tự động. Các Chyusen và audit log hiện có vẫn được giữ nguyên.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Hủy</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteSourceId && deleteSource.mutate({ id: deleteSourceId })}>Xóa nguồn</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
