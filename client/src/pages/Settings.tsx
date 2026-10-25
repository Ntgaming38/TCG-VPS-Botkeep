import { useEffect, useState } from "react";
import { Archive, BellRing, ChevronDown, ChevronUp, CircleAlert, CircleCheck, Clock3, DollarSign, Download, FileText, FileUp, ImageUp, PackageSearch, Plus, Radio, RefreshCw, Save, SlidersHorizontal, Sparkles, TimerReset, Trash2, Upload, Volume2, VolumeX } from "lucide-react";
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
import { DEFAULT_RGB_EFFECT_COLORS, DEFAULT_RGB_EFFECTS_ENABLED, DEFAULT_RGB_EFFECTS_SPEED, readRgbEffectsColors, readRgbEffectsEnabled, readRgbEffectsSpeed, RGB_EFFECT_SPEEDS, saveRgbEffectsColors, saveRgbEffectsEnabled, saveRgbEffectsSpeed, type RgbEffectColors, type RgbEffectSpeed } from "@/lib/rgbEffects";
import { DEFAULT_LOGIN_BACKGROUND_URL, readLoginBackgroundDailyEligibleUrls, readLoginBackgroundDailyRandom, readLoginBackgroundHistory, readLoginBackgroundUrl, rememberLoginBackgroundUrl, removeLoginBackgroundUrl, saveLoginBackgroundDailyEligibleUrls, saveLoginBackgroundDailyRandom, saveLoginBackgroundUrl, type LoginBackgroundHistoryItem } from "@/lib/loginBackground";
import { DEFAULT_LOGIN_BACKGROUND_EDIT, renderLoginBackgroundDataUrl, type LoginBackgroundEdit } from "@/lib/loginBackgroundEditor";
import { formatYen, readCurrencySymbolPosition, saveCurrencySymbolPosition, type CurrencySymbolPosition } from "@shared/formatYen";
import { FALLBACK_PRODUCT_IMAGE_URL } from "@/const";
import { DEFAULT_CARD_PRODUCT_IMAGE_ZOOM, DEFAULT_BOX_PACK_PRODUCT_IMAGE_ZOOM, PRODUCT_IMAGE_ZOOM_OPTIONS_WITH_LABELS, productImageImageStyle, productImageZoomLabel, readProductImageZoom, saveProductImageZoomToWindow, type ProductImageKind, type ProductImageZoom } from "@/lib/productImageDisplay";
import { getDataBackupFileName, rowsToCsv, type DataBackupScope } from "@shared/dataBackupExport";
import { dataBackupRestoreSchema, getDataBackupRestorePreview, type DataBackupRestorePayload } from "@shared/dataBackupRestore";
import { getSensitiveActivityLabel } from "@shared/sensitiveActivityLog";
import PushNotificationSettings from "@/components/PushNotificationSettings";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

const INTERVALS = [{ value: "60", label: "1 giờ" }, { value: "180", label: "3 giờ" }, { value: "360", label: "6 giờ" }, { value: "720", label: "12 giờ" }, { value: "1440", label: "24 giờ" }] as const;
const BATCH_SIZES = [6, 12, 18, 20] as const;
const TRASH_RETENTION_DAYS = [7, 14, 30, 60, 90, 180] as const;
type SourceDraft = { label: string; sourceUrl: string; checkIntervalMinutes: string; isActive: boolean };
type SourceFilter = "all" | "errors";
type SettingsSection = "rgb" | "currency" | "productImages" | "saleLocations" | "backup" | "activity" | "chyusen" | "sources" | "marketplace" | "trash" | "background" | "backgroundDaily" | "backgroundHistory" | "pushNotifications";

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
  const { data: trashAutoCleanup } = trpc.trash.autoCleanupStatus.useQuery();
  const { data: reportBranding } = trpc.reportBranding.get.useQuery();
  const { data: restoreHistory = [] } = trpc.backup.restoreHistory.useQuery();
  const { data: backupArchives = [] } = trpc.backup.archives.useQuery();
  const { data: autoBackupStatus } = trpc.backup.autoBackupStatus.useQuery();
  const { data: sensitiveActivities = [] } = trpc.activities.sensitive.useQuery();
  const { data: saleLocations = [] } = trpc.saleLocations.list.useQuery();
  const [sourceDrafts, setSourceDrafts] = useState<Record<number, SourceDraft>>({});
  const [deleteSourceId, setDeleteSourceId] = useState<number | null>(null);
  const [newSource, setNewSource] = useState({ label: "", sourceUrl: "", checkIntervalMinutes: "360" });
  const [newSaleLocation, setNewSaleLocation] = useState("");
  const [saleLocationDrafts, setSaleLocationDrafts] = useState<Record<number, string>>({});
  const [deleteSaleLocationId, setDeleteSaleLocationId] = useState<number | null>(null);
  const [sourcesExpanded, setSourcesExpanded] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [rgbEffectsEnabled, setRgbEffectsEnabled] = useState(() => readRgbEffectsEnabled(typeof window === "undefined" ? undefined : window.localStorage));
  const [rgbEffectsSpeed, setRgbEffectsSpeed] = useState<RgbEffectSpeed>(() => readRgbEffectsSpeed(typeof window === "undefined" ? undefined : window.localStorage));
  const [rgbEffectsColors, setRgbEffectsColors] = useState<RgbEffectColors>(() => readRgbEffectsColors(typeof window === "undefined" ? undefined : window.localStorage));
  const [currencySymbolPosition, setCurrencySymbolPosition] = useState<CurrencySymbolPosition>(() => readCurrencySymbolPosition(typeof window === "undefined" ? undefined : window.localStorage));
  const [cardImageZoom, setCardImageZoom] = useState<ProductImageZoom>(() => readProductImageZoom("card", typeof window === "undefined" ? undefined : window.localStorage));
  const [boxPackImageZoom, setBoxPackImageZoom] = useState<ProductImageZoom>(() => readProductImageZoom("box-pack", typeof window === "undefined" ? undefined : window.localStorage));
  const [loginBackgroundUrl, setLoginBackgroundUrl] = useState(() => readLoginBackgroundUrl(typeof window === "undefined" ? undefined : window.localStorage));
  const [loginBackgroundHistory, setLoginBackgroundHistory] = useState<LoginBackgroundHistoryItem[]>(() => readLoginBackgroundHistory(typeof window === "undefined" ? undefined : window.localStorage));
  const [loginBackgroundDailyRandom, setLoginBackgroundDailyRandom] = useState(() => readLoginBackgroundDailyRandom(typeof window === "undefined" ? undefined : window.localStorage));
  const [loginBackgroundDailyEligibleUrls, setLoginBackgroundDailyEligibleUrls] = useState<string[]>(() => { const storage = typeof window === "undefined" ? undefined : window.localStorage; const history = readLoginBackgroundHistory(storage); return readLoginBackgroundDailyEligibleUrls(history, storage); });
  const [loginBackgroundDraft, setLoginBackgroundDraft] = useState<{ source: string; edit: LoginBackgroundEdit } | null>(null);
  const [pendingBackgroundRemoval, setPendingBackgroundRemoval] = useState<string | null>(null);
  const [restoreBackup, setRestoreBackup] = useState<DataBackupRestorePayload | null>(null);
  const [restoreFileName, setRestoreFileName] = useState("");
  const [restoreConfirmation, setRestoreConfirmation] = useState("");
  const [restoreMode, setRestoreMode] = useState<"merge" | "overwrite">("merge");
  const [reportMonth, setReportMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [reportAccentColor, setReportAccentColor] = useState("#DC2626");
  const [collapsedSettingsSections, setCollapsedSettingsSections] = useState<Record<SettingsSection, boolean>>({ rgb: true, currency: true, productImages: true, saleLocations: true, backup: false, activity: true, chyusen: true, sources: true, marketplace: true, trash: true, background: true, backgroundDaily: true, backgroundHistory: true, pushNotifications: true });

  const updateSettings = trpc.chyusen.updateNotificationSettings.useMutation({ onSuccess: () => { utils.chyusen.notificationSettings.invalidate(); toast.success("Đã cập nhật cài đặt nhắc hạn."); } });
  const updateSource = trpc.chyusen.updateSource.useMutation({ onSuccess: () => { utils.chyusen.sources.invalidate(); toast.success("Đã lưu thay đổi nguồn theo dõi."); } });
  const deleteSource = trpc.chyusen.deleteSource.useMutation({ onSuccess: () => { setDeleteSourceId(null); setSourceDrafts({}); utils.chyusen.sources.invalidate(); toast.success("Đã xóa nguồn theo dõi."); } });
  const createSource = trpc.chyusen.createSource.useMutation({ onSuccess: () => { setNewSource({ label: "", sourceUrl: "", checkIntervalMinutes: "360" }); utils.chyusen.sources.invalidate(); toast.success("Đã thêm nguồn theo dõi."); } });
  const createSaleLocation = trpc.saleLocations.create.useMutation({ onSuccess: () => { setNewSaleLocation(""); utils.saleLocations.list.invalidate(); toast.success("Đã thêm nơi bán."); }, onError: (error) => toast.error(error.message || "Không thể thêm nơi bán.") });
  const updateSaleLocation = trpc.saleLocations.update.useMutation({ onSuccess: () => { setSaleLocationDrafts({}); utils.saleLocations.list.invalidate(); toast.success("Đã cập nhật nơi bán."); }, onError: (error) => toast.error(error.message || "Không thể cập nhật nơi bán.") });
  const deleteSaleLocation = trpc.saleLocations.delete.useMutation({ onSuccess: () => { setDeleteSaleLocationId(null); utils.saleLocations.list.invalidate(); toast.success("Đã xóa nơi bán khỏi danh sách."); }, onError: (error) => toast.error(error.message || "Không thể xóa nơi bán.") });
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
  const updateTrashAutoCleanup = trpc.trash.updateAutoCleanupSettings.useMutation({
    onSuccess: (settings) => {
      utils.trash.autoCleanupStatus.invalidate();
      toast.success(settings.isEnabled ? "Đã bật tự động dọn Thùng rác." : "Đã lưu cấu hình dọn Thùng rác.");
    },
    onError: (error) => toast.error(error.message || "Không thể lưu cấu hình tự động dọn Thùng rác."),
  });
  const uploadLoginBackground = trpc.loginBackground.upload.useMutation({
    onSuccess: (result) => {
      const url = saveLoginBackgroundUrl(result.url, window.localStorage);
      setLoginBackgroundUrl(url);
      const history = rememberLoginBackgroundUrl(url, window.localStorage);
      setLoginBackgroundHistory(history);
      setLoginBackgroundDailyEligibleUrls((current) => saveLoginBackgroundDailyEligibleUrls([...current, url], window.localStorage));
      setLoginBackgroundDraft(null);
      toast.success("Đã cập nhật nền đăng nhập trên thiết bị này.");
    },
    onError: (error) => toast.error(error.message || "Không thể tải ảnh nền lên."),
  });
  const exportData = trpc.backup.exportData.useMutation({ onError: (error) => toast.error(error.message || "Không thể tạo tệp xuất dữ liệu.") });
  const updateReportBranding = trpc.reportBranding.update.useMutation({ onSuccess: (branding) => { setReportAccentColor(branding?.accentColor || "#DC2626"); utils.reportBranding.get.invalidate(); toast.success("Đã lưu thương hiệu báo cáo PDF."); }, onError: (error) => toast.error(error.message || "Không thể lưu thương hiệu báo cáo.") });
  const uploadReportLogo = trpc.reportBranding.uploadLogo.useMutation({ onSuccess: (result) => updateReportBranding.mutate({ logoUrl: result.url }), onError: (error) => toast.error(error.message || "Không thể tải logo báo cáo.") });
  const createStoredSnapshot = trpc.backup.createStoredSnapshot.useMutation({ onSuccess: (result) => { utils.backup.archives.invalidate(); toast.success(`Đã lưu ${result.fileName} vào kho sao lưu.`); }, onError: (error) => toast.error(error.message || "Không thể lưu bản sao.") });
  const updateAutoBackup = trpc.backup.updateAutoBackup.useMutation({ onSuccess: (settings) => { utils.backup.autoBackupStatus.invalidate(); toast.success(settings.isEnabled ? "Đã bật sao lưu tự động." : "Đã lưu cấu hình sao lưu tự động."); }, onError: (error) => toast.error(error.message || "Không thể lưu sao lưu tự động.") });
  const { data: monthlyReport } = trpc.reports.monthly.useQuery({ month: reportMonth });
  const restoreData = trpc.backup.restoreData.useMutation({
    onSuccess: (result) => {
      setRestoreBackup(null);
      setRestoreFileName("");
      setRestoreConfirmation("");
      setRestoreMode("merge");
      void utils.products.list.invalidate();
      void utils.purchases.list.invalidate();
      void utils.sales.list.invalidate();
      void utils.dashboard.stats.invalidate();
      void utils.reports.overview.invalidate();
      void utils.chyusen.list.invalidate();
      void utils.chyusen.sources.invalidate();
      void utils.chyusen.notifications.invalidate();
      void utils.chyusen.notificationSettings.invalidate();
      void utils.shops.list.invalidate();
      void utils.saleLocations.list.invalidate();
      void utils.snkrShop.list.invalidate();
      void utils.trash.list.invalidate();
      void utils.reportBranding.get.invalidate();
      void utils.activities.sensitive.invalidate();
      toast.success(`Đã khôi phục (${result.mode === "overwrite" ? "ghi đè" : "gộp"}) ${result.restoredProducts} sản phẩm, ${result.restoredPurchases} mua, ${result.restoredSales} bán, ${result.restoredChyusen} Chyusen, ${result.restoredSources} nguồn, ${result.restoredShops} cửa hàng, ${result.restoredSaleLocations} nơi bán, ${result.restoredSnkrShop} Shop SNKR, ${result.restoredTrash} mục Thùng rác.`);
    },
    onError: (error) => toast.error(error.message || "Không thể khôi phục bản sao lưu."),
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
  const updateRgbEffects = (enabled: boolean) => {
    saveRgbEffectsEnabled(enabled, window.localStorage);
    setRgbEffectsEnabled(enabled);
    toast.success(enabled ? "Đã bật hiệu ứng RGB cho logo và tiêu đề." : "Đã tắt hiệu ứng RGB trên thiết bị này.");
  };
  const updateRgbEffectsSpeed = (speed: RgbEffectSpeed) => {
    saveRgbEffectsSpeed(speed, window.localStorage);
    setRgbEffectsSpeed(speed);
    toast.success(`Đã đặt tốc độ hiệu ứng RGB: ${speed === "slow" ? "Chậm" : speed === "fast" ? "Nhanh" : "Bình thường"}.`);
  };
  const updateRgbEffectsColor = (index: number, color: string) => {
    const next = rgbEffectsColors.map((current, currentIndex) => currentIndex === index ? color : current) as RgbEffectColors;
    saveRgbEffectsColors(next, window.localStorage);
    setRgbEffectsColors(next);
  };
  const resetRgbEffects = () => {
    saveRgbEffectsEnabled(DEFAULT_RGB_EFFECTS_ENABLED, window.localStorage);
    saveRgbEffectsSpeed(DEFAULT_RGB_EFFECTS_SPEED, window.localStorage);
    saveRgbEffectsColors(DEFAULT_RGB_EFFECT_COLORS, window.localStorage);
    setRgbEffectsEnabled(DEFAULT_RGB_EFFECTS_ENABLED);
    setRgbEffectsSpeed(DEFAULT_RGB_EFFECTS_SPEED);
    setRgbEffectsColors(DEFAULT_RGB_EFFECT_COLORS);
    toast.success("Đã khôi phục hiệu ứng RGB mặc định.");
  };
  const updateCurrencySymbolPosition = (position: CurrencySymbolPosition) => {
    saveCurrencySymbolPosition(position, window.localStorage);
    setCurrencySymbolPosition(position);
    toast.success(`Đã đặt ký hiệu ¥ ${position === "suffix" ? "sau" : "trước"} số tiền trên thiết bị này.`);
  };
  const updateProductImageZoom = (kind: ProductImageKind, zoom: ProductImageZoom) => {
    saveProductImageZoomToWindow(zoom, kind);
    if (kind === "card") setCardImageZoom(zoom);
    else setBoxPackImageZoom(zoom);
    toast.success(`Đã đặt mức zoom ${kind === "card" ? "Card dọc" : "Box/Pack ngang"}: ${productImageZoomLabel(zoom)}.`);
  };
  const resetProductImageZoom = (kind: ProductImageKind) => {
    const defaultZoom = kind === "card" ? DEFAULT_CARD_PRODUCT_IMAGE_ZOOM : DEFAULT_BOX_PACK_PRODUCT_IMAGE_ZOOM;
    saveProductImageZoomToWindow(defaultZoom, kind);
    if (kind === "card") setCardImageZoom(defaultZoom);
    else setBoxPackImageZoom(defaultZoom);
    toast.success(`Đã khôi phục zoom ${kind === "card" ? "Card dọc" : "Box/Pack ngang"} về mặc định.`);
  };
  const uploadLoginBackgroundFile = (file?: File) => {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { toast.error("Hãy chọn ảnh PNG, JPEG hoặc WEBP."); return; }
    if (file.size > 4_000_000) { toast.error("Ảnh nền phải có dung lượng tối đa 4 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => setLoginBackgroundDraft({ source: String(reader.result), edit: DEFAULT_LOGIN_BACKGROUND_EDIT });
    reader.onerror = () => toast.error("Không thể đọc tệp ảnh nền.");
    reader.readAsDataURL(file);
  };
  const resetLoginBackground = () => {
    const url = saveLoginBackgroundUrl(DEFAULT_LOGIN_BACKGROUND_URL, window.localStorage);
    setLoginBackgroundUrl(url);
    toast.success("Đã khôi phục nền đăng nhập mặc định.");
  };
  const selectLoginBackground = (url: string) => {
    setLoginBackgroundUrl(saveLoginBackgroundUrl(url, window.localStorage));
    toast.success("Đã đổi nền đăng nhập.");
  };
  const removeRecentLoginBackground = (url: string) => {
    const next = removeLoginBackgroundUrl(url, window.localStorage);
    setLoginBackgroundHistory(next);
    setLoginBackgroundDailyEligibleUrls((current) => saveLoginBackgroundDailyEligibleUrls(current.filter((currentUrl) => currentUrl !== url), window.localStorage));
    if (loginBackgroundUrl === url) setLoginBackgroundUrl(saveLoginBackgroundUrl(DEFAULT_LOGIN_BACKGROUND_URL, window.localStorage));
    toast.success("Đã xóa nền khỏi danh sách gần đây.");
  };
  const updateLoginBackgroundDailyRandom = (enabled: boolean) => {
    saveLoginBackgroundDailyRandom(enabled, window.localStorage);
    setLoginBackgroundDailyRandom(enabled);
    toast.success(enabled ? "Đã bật đổi nền ngẫu nhiên mỗi ngày." : "Đã tắt đổi nền ngẫu nhiên mỗi ngày.");
  };
  const downloadTextFile = (filename: string, contents: string, type: string) => {
    const blob = new Blob([contents], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };
  const exportCsv = async (scope: Exclude<DataBackupScope, "all">) => {
    const payload = await exportData.mutateAsync({ scope });
    const rows = ((scope === "chyusen" ? payload.chyusen?.entries : payload[scope]) || []) as unknown[];
    const csv = rowsToCsv(rows);
    if (!csv) { toast.error("Chưa có dữ liệu để xuất ở mục này."); return; }
    downloadTextFile(getDataBackupFileName(scope, "csv"), `\uFEFF${csv}`, "text/csv;charset=utf-8");
    toast.success(`Đã tải tệp ${scope === "inventory" ? "Kho hàng" : scope === "purchases" ? "Mua hàng" : scope === "sales" ? "Bán hàng" : "Chyusen"}.`);
  };
  const exportFullBackup = async () => {
    const payload = await exportData.mutateAsync({ scope: "all" });
    downloadTextFile("tcg-manager-full-backup.json", JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
    toast.success("Đã tải bản sao lưu toàn bộ dữ liệu.");
  };
  const readRestoreBackup = (file?: File) => {
    if (!file) return;
    if (file.size > 8_000_000) { toast.error("Tệp sao lưu tối đa 8 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(String(reader.result || "")) as Record<string, unknown>;
        const normalized = raw.exportType === "current_inventory" && Array.isArray(raw.products)
          ? { formatVersion: "1.0" as const, exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt : new Date().toISOString(), scope: "inventory" as const, inventory: raw.products }
          : raw;
        const parsed = dataBackupRestoreSchema.safeParse(normalized);
        if (!parsed.success) { toast.error("Tệp không đúng định dạng sao lưu TCG Manager 1.0."); return; }
        setRestoreBackup(parsed.data);
        setRestoreFileName(file.name);
        setRestoreConfirmation("");
      } catch {
        toast.error("Không thể đọc tệp JSON sao lưu.");
      }
    };
    reader.onerror = () => toast.error("Không thể đọc tệp sao lưu.");
    reader.readAsText(file);
  };
  const uploadPdfLogo = (file?: File) => {
    if (!file) return;
    if (file.size > 3_000_000) { toast.error("Logo báo cáo tối đa 3 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => uploadReportLogo.mutate({ imageDataUrl: String(reader.result || "") });
    reader.onerror = () => toast.error("Không thể đọc logo báo cáo.");
    reader.readAsDataURL(file);
  };
  useEffect(() => {
    if (reportBranding?.accentColor) setReportAccentColor(reportBranding.accentColor);
  }, [reportBranding?.accentColor]);
  const escapePdfHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] || character);
  const exportMonthlyPdf = async () => {
    if (!monthlyReport) { toast.error("Đang tải dữ liệu báo cáo tháng."); return; }
    const format = (value: number) => formatYen(value, "ja-JP", currencySymbolPosition);
    const accentColor = reportBranding?.accentColor || reportAccentColor || "#DC2626";
    const logoMarkup = reportBranding?.logoUrl ? `<img src="${escapePdfHtml(reportBranding.logoUrl)}" alt="Logo" style="width:50px;height:50px;object-fit:contain;border-radius:10px;margin-right:14px" />` : "";
    const reportSurface = document.createElement("section");
    reportSurface.style.cssText = "position:fixed;left:-10000px;top:0;width:760px;background:#ffffff;color:#111827;padding:42px;font-family:Arial,sans-serif;line-height:1.45;z-index:-1;";
    reportSurface.innerHTML = `<div style="border-bottom:3px solid ${accentColor};padding-bottom:18px;display:flex;align-items:center">${logoMarkup}<div><div style="color:${accentColor};font-size:12px;font-weight:700;letter-spacing:2px">TCG MANAGER</div><h1 style="margin:8px 0 4px;font-size:28px">Báo cáo thống kê tháng ${escapePdfHtml(reportMonth)}</h1><p style="margin:0;color:#4b5563;font-size:13px">Xuất ngày ${new Date().toLocaleDateString("vi-VN")}</p></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:22px 0">${[["Tổng đã mua", format(monthlyReport.totalBought)], ["Doanh thu", format(monthlyReport.totalRevenue)], ["Lợi nhuận", format(monthlyReport.totalProfit)], ["ROI", `${monthlyReport.roi.toFixed(1)}%`]].map(([label, value]) => `<div style="border:1px solid #d1d5db;border-radius:10px;padding:14px"><div style="color:#6b7280;font-size:12px">${label}</div><div style="font-size:20px;font-weight:700;margin-top:4px">${value}</div></div>`).join("")}</div><h2 style="font-size:17px;margin:20px 0 8px;color:${accentColor}">Tổng hợp giao dịch</h2><table style="width:100%;border-collapse:collapse;font-size:13px"><tbody><tr><td style="padding:8px;border-bottom:1px solid #e5e7eb">Số giao dịch mua</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700">${monthlyReport.purchaseCount}</td></tr><tr><td style="padding:8px;border-bottom:1px solid #e5e7eb">Số giao dịch bán / số lượng đã bán</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700">${monthlyReport.saleCount} / ${monthlyReport.soldUnits}</td></tr><tr><td style="padding:8px;border-bottom:1px solid #e5e7eb">Tổng phí giao dịch</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700">${format(monthlyReport.totalFees)}</td></tr></tbody></table><h2 style="font-size:17px;margin:24px 0 8px;color:${accentColor}">Top sản phẩm theo lợi nhuận</h2>${monthlyReport.topProducts.length ? `<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="background:${accentColor}18"><th style="padding:8px;text-align:left">Sản phẩm</th><th style="padding:8px;text-align:right">SL</th><th style="padding:8px;text-align:right">Doanh thu</th><th style="padding:8px;text-align:right">Lợi nhuận</th></tr></thead><tbody>${monthlyReport.topProducts.map((product) => `<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb">${escapePdfHtml(product.name)}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">${product.quantity}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">${format(product.revenue)}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">${format(product.profit)}</td></tr>`).join("")}</tbody></table>` : `<p style="color:#6b7280">Chưa có giao dịch bán trong tháng này.</p>`}<p style="margin-top:28px;color:#6b7280;font-size:10px">Báo cáo được tạo từ dữ liệu riêng của tài khoản TCG Manager.</p>`;
    document.body.appendChild(reportSurface);
    try {
      const canvas = await html2canvas(reportSurface, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const width = 190;
      const height = canvas.height * width / canvas.width;
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 10, 10, width, Math.min(height, 277));
      pdf.save(`tcg-manager-bao-cao-${reportMonth}.pdf`);
      toast.success("Đã tải báo cáo PDF theo tháng.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tạo báo cáo PDF.");
    } finally {
      reportSurface.remove();
    }
  };
  const toggleLoginBackgroundDailyEligible = (url: string) => {
    setLoginBackgroundDailyEligibleUrls((current) => {
      const next = current.includes(url) ? current.filter((currentUrl) => currentUrl !== url) : [...current, url];
      saveLoginBackgroundDailyEligibleUrls(next, window.localStorage);
      return next;
    });
  };
  const toggleSettingsSection = (section: SettingsSection, event: React.MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("button, input, [role=switch], [role=combobox]")) return;
    setCollapsedSettingsSections((current) => ({ ...current, [section]: !current[section] }));
  };
  const updateLoginBackgroundEdit = (patch: Partial<LoginBackgroundEdit>) => setLoginBackgroundDraft((current) => current ? { ...current, edit: { ...current.edit, ...patch } } : current);
  const saveEditedLoginBackground = async () => {
    if (!loginBackgroundDraft) return;
    try {
      const imageDataUrl = await renderLoginBackgroundDataUrl(loginBackgroundDraft.source, loginBackgroundDraft.edit);
      if (imageDataUrl.length > 5_500_000) { toast.error("Ảnh sau khi chỉnh vẫn quá lớn. Hãy giảm độ phóng to hoặc dùng ảnh nhẹ hơn."); return; }
      uploadLoginBackground.mutate({ imageDataUrl });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể chỉnh ảnh nền.");
    }
  };

  return <div className="settings-stack mx-auto max-w-5xl">
    <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-red-600">Workspace settings</p><h1 className="mt-1 text-3xl font-black tracking-tight">Cài đặt</h1><p className="mt-1 text-sm text-muted-foreground">Quản lý nhắc hạn, nguồn Chyusen và tự động đồng bộ giá ở một nơi.</p></div>

    <Card className="settings-collapsible-panel" data-collapsed={collapsedSettingsSections.pushNotifications}>
      <CardHeader data-settings-header onClick={(event) => toggleSettingsSection("pushNotifications", event)}><CardTitle className="flex items-center gap-2"><BellRing className="h-5 w-5 text-red-400" />Thông báo đẩy</CardTitle><CardDescription>Nhận thông báo ngay trên điện thoại khi có tin Chyusen mới hoặc giá Shop SNKR biến động trong các lượt đồng bộ tự động — kể cả khi app đang đóng. Mỗi thiết bị bật riêng một lần; trên iPhone cần mở app từ icon ngoài Màn hình chính (iOS 16.4 trở lên).</CardDescription></CardHeader>
      <CardContent><PushNotificationSettings /></CardContent>
    </Card>

    <Card className="settings-collapsible-panel" data-collapsed={collapsedSettingsSections.rgb}>
      <CardHeader data-settings-header onClick={(event) => toggleSettingsSection("rgb", event)}><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-fuchsia-400" />Hiệu ứng RGB</CardTitle><CardDescription>Bật hoặc tắt hiệu ứng màu chạy ngang cho logo TCG Manager và tiêu đề chính. Lựa chọn được lưu riêng trên thiết bị này.</CardDescription></CardHeader>
      <CardContent className="space-y-3"><div className="flex items-center justify-between gap-4 rounded-lg border p-3"><div><p className="text-sm font-semibold">Dải màu RGB</p><p className="mt-1 text-xs text-muted-foreground">{rgbEffectsEnabled ? "Đang bật cho logo và tiêu đề trang" : "Đang tắt — tiêu đề hiển thị màu mặc định"}</p></div><Switch checked={rgbEffectsEnabled} onCheckedChange={updateRgbEffects} aria-label="Bật hoặc tắt hiệu ứng RGB" /></div><div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_180px] sm:items-center"><div><p className="text-sm font-semibold">Tốc độ hiệu ứng</p><p className="mt-1 text-xs text-muted-foreground">Áp dụng cho dải màu RGB của logo và tiêu đề.</p></div><Select value={rgbEffectsSpeed} onValueChange={(value) => updateRgbEffectsSpeed(value as RgbEffectSpeed)}><SelectTrigger aria-label="Tốc độ hiệu ứng RGB"><SelectValue /></SelectTrigger><SelectContent>{RGB_EFFECT_SPEEDS.map((speed) => <SelectItem key={speed} value={speed}>{speed === "slow" ? "Chậm" : speed === "fast" ? "Nhanh" : "Bình thường"}</SelectItem>)}</SelectContent></Select></div><div className="rounded-lg border p-3"><p className="text-sm font-semibold">Màu gradient</p><p className="mt-1 text-xs text-muted-foreground">Chọn bốn màu để tạo dải gradient chạy theo ý thích.</p><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{rgbEffectsColors.map((color, index) => <label key={`${color}-${index}`} className="flex items-center gap-2 rounded-md border bg-background/40 px-2 py-1.5 text-xs"><input type="color" value={color} onChange={(event) => updateRgbEffectsColor(index, event.target.value.toUpperCase())} className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0" aria-label={`Chọn màu gradient ${index + 1}`} /><span className="font-mono text-muted-foreground">{color}</span></label>)}</div></div><div className={`rgb-effects-preview ${rgbEffectsEnabled ? "" : "is-disabled"}`} data-rgb-speed={rgbEffectsSpeed}><div className="flex items-center justify-between gap-3"><span className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Xem trước hiệu ứng</span><span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{rgbEffectsSpeed === "slow" ? "Chậm" : rgbEffectsSpeed === "fast" ? "Nhanh" : "Bình thường"}</span></div><p className="rgb-effects-preview-logo mt-3">TCG Manager</p><p className="rgb-effects-preview-title mt-1">Tiêu đề trang của bạn</p><p className="mt-2 text-xs text-muted-foreground">{rgbEffectsEnabled ? "Bản xem trước thay đổi ngay theo tốc độ và màu bạn chọn." : "Bật hiệu ứng RGB để xem chuyển động màu."}</p></div><div className="flex justify-end"><Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={resetRgbEffects}><TimerReset className="h-3.5 w-3.5" />Đặt lại mặc định</Button></div></CardContent>
    </Card>

    <Card className="settings-collapsible-panel settings-currency-card" data-collapsed={collapsedSettingsSections.currency}>
      <CardHeader data-settings-header onClick={(event) => toggleSettingsSection("currency", event)}><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-emerald-400" />Định dạng tiền tệ</CardTitle><CardDescription>Chọn vị trí ký hiệu ¥ cho số tiền trên toàn ứng dụng. Lựa chọn được lưu riêng trên thiết bị này.</CardDescription></CardHeader>
      <CardContent className="space-y-3"><div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_190px] sm:items-center"><div><p className="text-sm font-semibold">Vị trí ký hiệu ¥</p><p className="mt-1 text-xs text-muted-foreground">Số âm luôn có dấu trừ ngay trước số tiền; phần Lợi nhuận âm vẫn dùng màu đỏ và animation.</p></div><Select value={currencySymbolPosition} onValueChange={(value) => updateCurrencySymbolPosition(value as CurrencySymbolPosition)}><SelectTrigger aria-label="Vị trí ký hiệu tiền tệ"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="suffix">Sau số tiền — 1,000 ¥</SelectItem><SelectItem value="prefix">Trước số tiền — ¥ 1,000</SelectItem></SelectContent></Select></div><div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Xem trước</p><div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1"><p className="text-base font-bold text-foreground">{formatYen(12800, "ja-JP", currencySymbolPosition)}</p><p className="text-base font-bold text-red-400">{formatYen(-12800, "ja-JP", currencySymbolPosition)}</p></div></div></CardContent>
    </Card>

    <Card className="settings-collapsible-panel" data-collapsed={collapsedSettingsSections.productImages}>
      <CardHeader data-settings-header onClick={(event) => toggleSettingsSection("productImages", event)}><CardTitle className="flex items-center gap-2"><ImageUp className="h-5 w-5 text-teal-400" />Hiển thị ảnh sản phẩm</CardTitle><CardDescription>Điều chỉnh mức phóng to cho ảnh Card, Box và Pack trên toàn bộ ứng dụng. Nền trắng vẫn phủ kín khung và ảnh không bị méo.</CardDescription></CardHeader>
      <CardContent className="space-y-3"><p className="text-xs text-muted-foreground">Hai nhóm zoom được lưu riêng trên thiết bị này. Ảnh luôn được căn giữa trong nền trắng full khung.</p><div className="grid gap-3 lg:grid-cols-2"><div className="rounded-lg border p-3"><div className="flex items-center justify-between gap-2"><div><p className="text-sm font-semibold">Card dọc</p><p className="mt-1 text-xs text-muted-foreground">Hiện tại: <span className="font-semibold text-teal-300">{productImageZoomLabel(cardImageZoom)}</span></p></div><Button type="button" variant="outline" size="sm" onClick={() => resetProductImageZoom("card")}>Khôi phục mặc định</Button></div><div className="mt-3 flex items-center gap-3"><div className="flex h-24 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white bg-white"><img src={FALLBACK_PRODUCT_IMAGE_URL} alt="Xem trước zoom ảnh Card dọc" className="h-full w-full object-contain" style={productImageImageStyle(cardImageZoom)} /></div><Select value={String(cardImageZoom)} onValueChange={(value) => updateProductImageZoom("card", Number(value) as ProductImageZoom)}><SelectTrigger aria-label="Mức phóng to ảnh Card dọc"><SelectValue /></SelectTrigger><SelectContent>{PRODUCT_IMAGE_ZOOM_OPTIONS_WITH_LABELS.map((option) => <SelectItem key={option.value} value={String(option.value)}>{option.label}</SelectItem>)}</SelectContent></Select></div></div><div className="rounded-lg border p-3"><div className="flex items-center justify-between gap-2"><div><p className="text-sm font-semibold">Box/Pack ngang</p><p className="mt-1 text-xs text-muted-foreground">Hiện tại: <span className="font-semibold text-teal-300">{productImageZoomLabel(boxPackImageZoom)}</span></p></div><Button type="button" variant="outline" size="sm" onClick={() => resetProductImageZoom("box-pack")}>Khôi phục mặc định</Button></div><div className="mt-3 flex items-center gap-3"><div className="flex h-24 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white bg-white"><img src={FALLBACK_PRODUCT_IMAGE_URL} alt="Xem trước zoom ảnh Box/Pack ngang" className="h-full w-full object-contain" style={productImageImageStyle(boxPackImageZoom)} /></div><Select value={String(boxPackImageZoom)} onValueChange={(value) => updateProductImageZoom("box-pack", Number(value) as ProductImageZoom)}><SelectTrigger aria-label="Mức phóng to ảnh Box/Pack ngang"><SelectValue /></SelectTrigger><SelectContent>{PRODUCT_IMAGE_ZOOM_OPTIONS_WITH_LABELS.map((option) => <SelectItem key={option.value} value={String(option.value)}>{option.label}</SelectItem>)}</SelectContent></Select></div></div></div></CardContent>
    </Card>

    <Card className="settings-collapsible-panel" data-collapsed={collapsedSettingsSections.saleLocations}>
      <CardHeader data-settings-header onClick={(event) => toggleSettingsSection("saleLocations", event)}><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-rose-400" />Quản lý nơi bán</CardTitle><CardDescription>Tạo danh sách nơi bán riêng để chọn nhanh khi lập giao dịch Bán hàng. Các giao dịch cũ vẫn giữ nguyên tên nơi bán đã ghi nhận.</CardDescription></CardHeader>
      <CardContent className="space-y-3"><div className="space-y-2">{saleLocations.length ? saleLocations.map((location: any) => { const draft = saleLocationDrafts[location.id] ?? location.name; return <div key={location.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center"><Input value={draft} maxLength={120} onChange={(event) => setSaleLocationDrafts((current) => ({ ...current, [location.id]: event.target.value }))} aria-label={`Tên nơi bán ${location.name}`} /><div className="flex shrink-0 gap-2"><Button type="button" variant="outline" size="sm" disabled={!draft.trim() || draft.trim() === location.name || updateSaleLocation.isPending} onClick={() => updateSaleLocation.mutate({ id: location.id, name: draft.trim() })}><Save className="mr-1.5 h-3.5 w-3.5" />Lưu</Button><Button type="button" variant="outline" size="sm" className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800" onClick={() => setDeleteSaleLocationId(location.id)}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Xóa</Button></div></div>; }) : <p className="rounded-lg border border-dashed px-3 py-5 text-center text-sm text-muted-foreground">Chưa có nơi bán tùy chỉnh. Bạn vẫn có thể dùng các lựa chọn mặc định trong Bán hàng.</p>}</div><div className="flex flex-col gap-2 rounded-lg border border-dashed p-3 sm:flex-row"><Input value={newSaleLocation} maxLength={120} placeholder="VD: Khách quen Tokyo, Sự kiện Osaka..." onChange={(event) => setNewSaleLocation(event.target.value)} aria-label="Tên nơi bán mới" /><Button type="button" className="bg-red-600 hover:bg-red-700" disabled={!newSaleLocation.trim() || createSaleLocation.isPending} onClick={() => createSaleLocation.mutate({ name: newSaleLocation.trim() })}><Plus className="mr-1.5 h-4 w-4" />{createSaleLocation.isPending ? "Đang thêm" : "Thêm nơi bán"}</Button></div></CardContent>
    </Card>

    <AlertDialog open={deleteSaleLocationId !== null} onOpenChange={(open) => !open && setDeleteSaleLocationId(null)}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xóa nơi bán?</AlertDialogTitle><AlertDialogDescription>Nơi bán sẽ bị xóa khỏi danh sách lựa chọn mới. Các giao dịch đã lưu vẫn giữ nguyên lịch sử nơi bán.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Hủy</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteSaleLocationId !== null && deleteSaleLocation.mutate({ id: deleteSaleLocationId })}>Xóa nơi bán</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>

    <Card className="settings-collapsible-panel" data-collapsed={collapsedSettingsSections.backup}>
      <CardHeader data-settings-header onClick={(event) => toggleSettingsSection("backup", event)}><CardTitle className="flex items-center gap-2"><Archive className="h-5 w-5 text-sky-400" />Sao lưu, khôi phục & Xuất dữ liệu</CardTitle><CardDescription>Tải bản sao lưu về thiết bị hoặc chọn tệp JSON để khôi phục dữ liệu vào tài khoản hiện tại.</CardDescription></CardHeader>
      <CardContent className="space-y-4"><div className="grid gap-2 sm:grid-cols-2">{(["inventory", "purchases", "sales", "chyusen"] as const).map((scope) => <div key={scope} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div><p className="text-sm font-semibold">{scope === "inventory" ? "Kho hàng" : scope === "purchases" ? "Mua hàng" : scope === "sales" ? "Bán hàng" : "Chyusen"}</p><p className="mt-0.5 text-xs text-muted-foreground">Tải bảng dữ liệu CSV</p></div><Button variant="outline" size="sm" disabled={exportData.isPending} onClick={() => void exportCsv(scope)}><Download className="mr-1.5 h-3.5 w-3.5" />CSV</Button></div>)}</div><div className="flex flex-col gap-3 rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">Sao lưu toàn bộ</p><p className="mt-1 text-xs text-muted-foreground">Bao gồm Kho hàng, Mua, Bán, Chyusen, nguồn theo dõi, Cửa hàng, Nơi bán, Shop SNKR, Thùng rác, hồ sơ người dùng và cài đặt nhắc hạn. Tệp này không chứa mật khẩu.</p></div><Button className="bg-red-600 hover:bg-red-700" disabled={exportData.isPending} onClick={() => void exportFullBackup()}><Archive className="mr-1.5 h-4 w-4" /><span className="rgb-action-label">{exportData.isPending ? "Đang tạo tệp" : "Tải JSON"}</span></Button></div><div className="grid gap-3 border-t pt-4 lg:grid-cols-2"><div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3"><div><p className="flex items-center gap-2 text-sm font-semibold"><FileUp className="h-4 w-4 text-amber-400" />Khôi phục từ JSON</p><p className="mt-1 text-xs text-muted-foreground">Chọn bản sao lưu TCG Manager 1.0 để xem trước. Bấm Gộp để thêm dữ liệu vào tài khoản hiện tại (trùng lặp được bỏ qua) hoặc Ghi đè để xóa dữ liệu hiện tại rồi khôi phục nguyên vẹn từ tệp.</p></div><Input type="file" accept="application/json,.json" disabled={restoreData.isPending} onChange={(event) => { readRestoreBackup(event.target.files?.[0]); event.currentTarget.value = ""; }} />{restoreBackup && <div className="space-y-3 rounded-md border border-amber-500/25 bg-background/40 p-3"><p className="text-xs font-semibold">Tệp: {restoreFileName}</p><p className="text-xs text-muted-foreground">Xuất lúc {new Date(getDataBackupRestorePreview(restoreBackup).exportedAt).toLocaleString("vi-VN")}</p><div className="grid grid-cols-2 gap-2 text-xs"><span>Kho hàng: <b>{getDataBackupRestorePreview(restoreBackup).inventoryCount}</b></span><span>Mua hàng: <b>{getDataBackupRestorePreview(restoreBackup).purchaseCount}</b></span><span>Bán hàng: <b>{getDataBackupRestorePreview(restoreBackup).saleCount}</b></span><span>Chyusen: <b>{getDataBackupRestorePreview(restoreBackup).chyusenCount}</b></span><span>Cửa hàng: <b>{getDataBackupRestorePreview(restoreBackup).shopCount}</b></span><span>Nơi bán: <b>{getDataBackupRestorePreview(restoreBackup).saleLocationCount}</b></span><span>Shop SNKR: <b>{getDataBackupRestorePreview(restoreBackup).snkrShopCount}</b></span><span>Thùng rác: <b>{getDataBackupRestorePreview(restoreBackup).trashCount}</b></span></div><Select value={restoreMode} onValueChange={(value) => setRestoreMode(value as "merge" | "overwrite")}><SelectTrigger aria-label="Chế độ khôi phục"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="merge">Gộp — bỏ qua mục trùng lặp</SelectItem><SelectItem value="overwrite">Ghi đè — xóa dữ liệu hiện tại trước</SelectItem></SelectContent></Select>{restoreMode === "overwrite" && <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-500">Chế độ Ghi đè sẽ xóa toàn bộ Kho hàng, Mua, Bán, Chyusen, Cửa hàng, Nơi bán, Shop SNKR và Thùng rác của tài khoản này trước khi khôi phục từ tệp.</p>}<Input value={restoreConfirmation} onChange={(event) => setRestoreConfirmation(event.target.value)} placeholder="Nhập KHÔI PHỤC để xác nhận" aria-label="Xác nhận khôi phục dữ liệu" /><Button type="button" className="w-full bg-red-600 hover:bg-red-700" disabled={restoreConfirmation !== "KHÔI PHỤC" || restoreData.isPending} onClick={() => restoreBackup && restoreData.mutate({ backup: restoreBackup, sourceFileName: restoreFileName || undefined, mode: restoreMode, confirmed: true })}><span className="rgb-action-label">{restoreData.isPending ? "Đang khôi phục" : restoreMode === "overwrite" ? "Ghi đè & khôi phục" : "Gộp dữ liệu"}</span></Button></div>}</div><div className="space-y-3 rounded-lg border border-violet-500/30 bg-violet-500/5 p-3"><div><p className="flex items-center gap-2 text-sm font-semibold"><FileText className="h-4 w-4 text-violet-400" />Báo cáo tháng PDF</p><p className="mt-1 text-xs text-muted-foreground">Tạo báo cáo gồm mua, doanh thu, lợi nhuận, ROI, phí giao dịch và top sản phẩm trong tháng chọn.</p></div><Input type="month" value={reportMonth} onChange={(event) => setReportMonth(event.target.value)} aria-label="Chọn tháng báo cáo PDF" /><div className="grid grid-cols-2 gap-2 text-xs"><span>Doanh thu: <b>{formatYen(monthlyReport?.totalRevenue || 0, "ja-JP", currencySymbolPosition)}</b></span><span>Lợi nhuận: <b>{formatYen(monthlyReport?.totalProfit || 0, "ja-JP", currencySymbolPosition)}</b></span></div><Button type="button" variant="outline" className="w-full" onClick={() => void exportMonthlyPdf()}><FileText className="mr-1.5 h-4 w-4" />Tải báo cáo PDF</Button></div></div></CardContent>
    </Card>

    <Card className="border border-violet-500/25 bg-violet-500/[0.03]">
      <CardHeader><CardTitle className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-violet-400" />Lịch sử & Sao lưu tự động</CardTitle><CardDescription>Theo dõi khôi phục, cá nhân hóa báo cáo PDF và bảo vệ dữ liệu bằng bản sao định kỳ lưu riêng cho tài khoản.</CardDescription></CardHeader>
      <CardContent className="space-y-4"><div className="grid gap-3 lg:grid-cols-2"><div className="space-y-3 rounded-lg border p-3"><div><p className="text-sm font-semibold">Thương hiệu báo cáo PDF</p><p className="mt-1 text-xs text-muted-foreground">Chọn màu nhấn và logo cá nhân trước khi tải báo cáo tháng.</p></div><div className="flex items-center gap-3"><input type="color" value={reportAccentColor} onChange={(event) => setReportAccentColor(event.target.value.toUpperCase())} className="h-10 w-10 cursor-pointer rounded border-0 bg-transparent p-0" aria-label="Màu nhấn báo cáo PDF" /><div className="min-w-0 flex-1"><p className="font-mono text-xs text-muted-foreground">{reportAccentColor}</p><Button type="button" variant="outline" size="sm" className="mt-1" disabled={updateReportBranding.isPending} onClick={() => updateReportBranding.mutate({ accentColor: reportAccentColor })}>Lưu màu</Button></div>{reportBranding?.logoUrl ? <img src={reportBranding.logoUrl} alt="Logo báo cáo" className="h-12 w-12 rounded-lg border bg-white object-contain" /> : <div className="flex h-12 w-12 items-center justify-center rounded-lg border text-xs text-muted-foreground">Logo</div>}</div><div className="flex flex-wrap gap-2"><label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-semibold hover:bg-muted"><Upload className="h-3.5 w-3.5" />Tải logo<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => { uploadPdfLogo(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label>{reportBranding?.logoUrl && <Button type="button" variant="outline" size="sm" onClick={() => updateReportBranding.mutate({ logoUrl: null })}>Bỏ logo</Button>}</div></div><div className="space-y-3 rounded-lg border p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">Sao lưu tự động</p><p className="mt-1 text-xs text-muted-foreground">Lưu JSON đầy đủ vào kho riêng hàng tuần hoặc ngày đầu mỗi tháng, chạy tự động bằng cron trên máy chủ.</p></div><Switch checked={Boolean(autoBackupStatus?.isEnabled)} onCheckedChange={(checked) => updateAutoBackup.mutate({ isEnabled: checked, frequency: autoBackupStatus?.frequency || "weekly" })} aria-label="Bật sao lưu tự động" /></div><Select value={autoBackupStatus?.frequency || "weekly"} onValueChange={(value) => updateAutoBackup.mutate({ frequency: value as "weekly" | "monthly", isEnabled: Boolean(autoBackupStatus?.isEnabled) })}><SelectTrigger aria-label="Tần suất sao lưu tự động"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="weekly">Hàng tuần — Chủ nhật</SelectItem><SelectItem value="monthly">Hàng tháng — ngày 1</SelectItem></SelectContent></Select><div className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">{autoBackupStatus?.lastRunAt ? `Lần chạy gần nhất: ${new Date(autoBackupStatus.lastRunAt).toLocaleString("vi-VN")}` : "Chưa có lần chạy tự động."}{autoBackupStatus?.lastRunSummary ? ` ${autoBackupStatus.lastRunSummary}` : ""}</div><Button type="button" variant="outline" size="sm" disabled={createStoredSnapshot.isPending} onClick={() => createStoredSnapshot.mutate()}><Archive className="mr-1.5 h-3.5 w-3.5" />{createStoredSnapshot.isPending ? "Đang lưu" : "Lưu bản sao ngay"}</Button></div></div><div className="grid gap-3 lg:grid-cols-2"><div className="rounded-lg border p-3"><p className="text-sm font-semibold">Lịch sử khôi phục</p><div className="mt-2 space-y-2">{restoreHistory.length ? restoreHistory.slice(0, 5).map((item) => <div key={item.id} className="rounded-md bg-muted/50 p-2 text-xs"><p className="font-medium">{item.sourceFileName}</p><p className="mt-0.5 text-muted-foreground">{new Date(item.restoredAt).toLocaleString("vi-VN")} · {item.restoredProducts} Kho, {item.restoredPurchases} Mua, {item.restoredSales} Bán, {item.restoredChyusen} Chyusen</p></div>) : <p className="text-xs text-muted-foreground">Chưa có dữ liệu khôi phục.</p>}</div></div><div className="rounded-lg border p-3"><p className="text-sm font-semibold">Bản sao đã lưu</p><div className="mt-2 space-y-2">{backupArchives.length ? backupArchives.slice(0, 5).map((item) => <a key={item.id} href={item.fileUrl} className="block rounded-md bg-muted/50 p-2 text-xs hover:bg-muted"><p className="font-medium">{item.fileName}</p><p className="mt-0.5 text-muted-foreground">{new Date(item.createdAt).toLocaleString("vi-VN")} · {Math.max(1, Math.ceil(item.fileSize / 1024))} KB · {item.source === "scheduled" ? "Tự động" : "Thủ công"}</p></a>) : <p className="text-xs text-muted-foreground">Chưa có bản sao lưu trong kho.</p>}</div></div></div></CardContent>
    </Card>

    <Card className="settings-collapsible-panel" data-collapsed={collapsedSettingsSections.activity}>
      <CardHeader data-settings-header onClick={(event) => toggleSettingsSection("activity", event)}><CardTitle className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-amber-400" />Nhật ký hoạt động</CardTitle><CardDescription>Ghi lại các thao tác nhạy cảm đã được xác nhận trên tài khoản này.</CardDescription></CardHeader>
      <CardContent className="space-y-2">{sensitiveActivities.length ? sensitiveActivities.map((item) => <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg border p-3"><div className="min-w-0"><p className="text-sm font-semibold">{getSensitiveActivityLabel(item.action)}</p><p className="mt-1 text-xs text-muted-foreground">{item.description || "Không có mô tả chi tiết."}</p></div><time className="shrink-0 text-right text-[11px] text-muted-foreground">{new Date(item.createdAt).toLocaleString("vi-VN")}</time></div>) : <p className="rounded-lg border border-dashed px-3 py-5 text-center text-sm text-muted-foreground">Chưa có thao tác nhạy cảm nào được ghi nhận.</p>}</CardContent>
    </Card>

    <Card className="border border-amber-500/25 bg-amber-500/[0.03]">
      <CardHeader><CardTitle className="flex items-center gap-2"><TimerReset className="h-5 w-5 text-amber-400" />Tự động dọn Nhật ký hoạt động</CardTitle><CardDescription>Hệ thống dọn các mục xóa vĩnh viễn và khôi phục đã cũ để tối ưu dữ liệu.</CardDescription></CardHeader>
      <CardContent><div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3"><div><p className="text-sm font-semibold">Giữ nhật ký trong 30 ngày</p><p className="mt-1 text-xs text-muted-foreground">Tác vụ chạy hằng ngày và chỉ xóa nhật ký nhạy cảm cũ hơn 30 ngày; dữ liệu Kho hàng, Mua/Bán và Chyusen không bị ảnh hưởng.</p></div><span className="rounded-full border border-amber-500/30 bg-background/50 px-2.5 py-1 text-xs font-semibold text-amber-300">Tự động</span></div></CardContent>
    </Card>

    <Card className="settings-collapsible-panel" data-collapsed={collapsedSettingsSections.chyusen}>
      <CardHeader data-settings-header onClick={(event) => toggleSettingsSection("chyusen", event)}><CardTitle className="flex items-center gap-2"><BellRing className="h-5 w-5 text-red-600" />Nhắc hạn Chyusen</CardTitle><CardDescription>Chọn các mốc nhắc áp dụng riêng cho tài khoản của bạn.</CardDescription></CardHeader>
      <CardContent className="space-y-5"><div className="flex flex-wrap gap-2">{[168, 72, 24, 12, 3, 1].map((hour) => { const selected = deadlineHours.includes(hour); return <Button key={hour} variant={selected ? "default" : "outline"} size="sm" className={selected ? "bg-red-600 hover:bg-red-700" : ""} onClick={() => updateSettings.mutate({ deadlineHours: selected ? deadlineHours.filter((value: number) => value !== hour) : [...deadlineHours, hour] })}>{hour >= 24 ? `${hour / 24} ngày` : `${hour} giờ`}</Button>; })}</div><div className="grid gap-3 border-t pt-4 sm:grid-cols-2">{[["lotteryNew", "Chyusen mới"], ["lotteryExpiring", "Sắp hết hạn"], ["lotteryResult", "Ngày công bố"], ["lotteryChanged", "Nguồn thay đổi"]].map(([key, label]) => <div key={key} className="flex items-center justify-between rounded-lg border p-3"><span className="text-sm font-medium">{label}</span><Switch checked={notificationSettings ? Boolean((notificationSettings as any)[key]) : true} onCheckedChange={(checked) => updateSettings.mutate({ [key]: checked })} /></div>)}</div><div className="grid gap-3 border-t pt-4 sm:grid-cols-2"><div className="flex items-center justify-between rounded-lg border p-3"><span className="flex items-center gap-2 text-sm font-medium"><Volume2 className="h-4 w-4 text-red-500" />Âm khi có thông báo mới</span><Switch checked={Boolean(notificationSettings?.soundNewEnabled)} onCheckedChange={(checked) => updateSettings.mutate({ soundNewEnabled: checked })} /></div><div className="flex items-center justify-between rounded-lg border p-3"><span className="flex items-center gap-2 text-sm font-medium"><VolumeX className="h-4 w-4 text-red-500" />Âm khi thông báo khẩn</span><Switch checked={Boolean(notificationSettings?.soundUrgentEnabled)} onCheckedChange={(checked) => updateSettings.mutate({ soundUrgentEnabled: checked })} /></div></div></CardContent>
    </Card>

    <Card className="settings-collapsible-panel" data-collapsed={collapsedSettingsSections.sources}>
      <CardHeader data-settings-header onClick={(event) => toggleSettingsSection("sources", event)} className="gap-3 sm:flex sm:flex-row sm:items-start sm:justify-between"><div><CardTitle className="flex items-center gap-2"><Radio className="h-5 w-5 text-red-600" />Nguồn theo dõi</CardTitle><CardDescription className="mt-1">Thu gọn danh sách khi không cần chỉnh sửa; dùng bộ lọc để xem nhanh nguồn lỗi.</CardDescription></div><div className="flex flex-wrap gap-2"><Button size="sm" variant={sourceFilter === "errors" ? "default" : "outline"} className={sourceFilter === "errors" ? "bg-red-600 hover:bg-red-700" : ""} onClick={() => setSourceFilter((current) => current === "errors" ? "all" : "errors")}><CircleAlert className="mr-1.5 h-3.5 w-3.5" />{sourceFilter === "errors" ? "Đang lọc lỗi" : `Nguồn lỗi (${failedSources.length})`}</Button><Button size="sm" variant="outline" onClick={() => setSourcesExpanded((current) => !current)} aria-expanded={sourcesExpanded}>{sourcesExpanded ? <ChevronUp className="mr-1.5 h-3.5 w-3.5" /> : <ChevronDown className="mr-1.5 h-3.5 w-3.5" />}{sourcesExpanded ? "Thu gọn" : `Mở rộng (${visibleSources.length})`}</Button></div></CardHeader>
      <Collapsible open={sourcesExpanded} onOpenChange={setSourcesExpanded}><CollapsibleContent><CardContent className="space-y-3">{visibleSources.length === 0 ? <div className="rounded-lg border border-dashed px-4 py-7 text-center"><CircleAlert className="mx-auto mb-2 h-5 w-5 text-muted-foreground" /><p className="text-sm font-semibold">Không có nguồn đang lỗi</p><p className="mt-1 text-xs text-muted-foreground">Đổi bộ lọc để xem tất cả nguồn theo dõi.</p></div> : visibleSources.map((source: any) => { const draft = sourceDraft(source); const hasError = source.latestStatus === "unavailable"; return <div key={source.id} className="space-y-3 rounded-lg border p-3"><div className="grid gap-3 md:grid-cols-[1fr_1.5fr_110px_auto]"><Input value={draft.label} onChange={(event) => updateDraft(source, { label: event.target.value })} placeholder="Tên nguồn" /><Input value={draft.sourceUrl} onChange={(event) => updateDraft(source, { sourceUrl: event.target.value })} placeholder="URL công khai" /><Select value={draft.checkIntervalMinutes} onValueChange={(value) => updateDraft(source, { checkIntervalMinutes: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{INTERVALS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select><div className="flex items-center gap-2"><Switch checked={draft.isActive} onCheckedChange={(checked) => updateDraft(source, { isActive: checked })} /><span className="text-xs text-muted-foreground">{draft.isActive ? "Bật" : "Tắt"}</span></div></div><div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3"><div className="flex flex-wrap items-center gap-2 text-xs"><span className={`rounded-full border px-2 py-0.5 font-semibold ${statusStyle(source.latestStatus)}`}>{source.latestStatus === "unavailable" ? "Không truy cập được" : source.latestStatus === "detected" ? "Có thay đổi" : "Hoạt động bình thường"}</span><span className="text-muted-foreground">Kiểm tra gần nhất: {source.lastCheckedAt ? new Date(source.lastCheckedAt).toLocaleString("vi-VN") : "Chưa có"}</span>{hasError && <span className="inline-flex items-center gap-1 text-red-700"><CircleAlert className="h-3.5 w-3.5" />{source.latestError || "Lỗi không xác định"}</span>}</div><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={checkSourceNow.isPending} onClick={() => checkSourceNow.mutate({ id: source.id })}><RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${checkSourceNow.isPending ? "animate-spin" : ""}`} />{checkSourceNow.isPending ? "Đang kiểm tra" : "Kiểm tra ngay"}</Button><Button variant="outline" size="sm" disabled={updateSource.isPending} onClick={() => saveSource(source)}><Save className="mr-1.5 h-3.5 w-3.5" />{updateSource.isPending ? "Đang lưu" : "Lưu"}</Button><Button variant="outline" size="sm" className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800" onClick={() => setDeleteSourceId(source.id)}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Xóa</Button></div></div></div>; })}<div className="grid gap-3 rounded-lg border border-dashed p-3 md:grid-cols-[1fr_1.5fr_110px_auto]"><Input value={newSource.label} onChange={(e) => setNewSource({ ...newSource, label: e.target.value })} placeholder="Tên nguồn mới" /><Input value={newSource.sourceUrl} onChange={(e) => setNewSource({ ...newSource, sourceUrl: e.target.value })} placeholder="https://..." /><Select value={newSource.checkIntervalMinutes} onValueChange={(value) => setNewSource({ ...newSource, checkIntervalMinutes: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{INTERVALS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select><Button disabled={!newSource.sourceUrl || createSource.isPending} className="bg-red-600 hover:bg-red-700" onClick={() => createSource.mutate({ label: newSource.label, sourceUrl: newSource.sourceUrl, checkIntervalMinutes: Number(newSource.checkIntervalMinutes) as 60 | 180 | 360 | 720 | 1440 })}>{createSource.isPending ? "Đang lưu" : "Thêm nguồn"}</Button></div></CardContent></CollapsibleContent></Collapsible>
    </Card>

    <Card className="settings-collapsible-panel" data-collapsed={collapsedSettingsSections.marketplace}>
      <CardHeader data-settings-header onClick={(event) => toggleSettingsSection("marketplace", event)}><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><PackageSearch className="h-5 w-5 text-red-600" />Đồng bộ giá Marketplace</CardTitle><CardDescription className="mt-1">Tự động đồng bộ SNKRDUNK mỗi 6 giờ. Bạn có thể chạy thủ công theo yêu cầu bất cứ lúc nào.</CardDescription></div><Button className="bg-red-600 hover:bg-red-700" disabled={syncMarketplaceNow.isPending} onClick={() => syncMarketplaceNow.mutate()}><RefreshCw className={`mr-1.5 h-4 w-4 ${syncMarketplaceNow.isPending ? "animate-spin" : ""}`} /><span className="rgb-action-label">{syncMarketplaceNow.isPending ? "Đang đồng bộ" : "Đồng bộ ngay"}</span></Button></div></CardHeader>
      <CardContent className="space-y-4"><div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_auto]"><div><p className="text-sm font-semibold">Đồng bộ tự động</p><p className="text-xs text-muted-foreground">Tối đa {autoSyncStatus?.batchSize || 12} sản phẩm/lần, giữ nguyên giá cũ nếu nguồn không trả giá hợp lệ.</p></div><div className="flex items-center gap-2"><Switch checked={Boolean(autoSyncStatus?.isEnabled)} disabled={!autoSyncStatus || updateAutoSync.isPending} onCheckedChange={(isEnabled) => updateAutoSync.mutate({ isEnabled })} /><span className="text-xs font-medium">{autoSyncStatus?.isEnabled ? "Đang bật" : "Đang tắt"}</span></div></div><div className="grid gap-3 sm:grid-cols-2"><div><p className="mb-2 text-xs font-semibold text-muted-foreground">Kích thước lô tự động</p><Select value={String(autoSyncStatus?.batchSize || 12)} onValueChange={(value) => updateAutoSync.mutate({ batchSize: Number(value) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{BATCH_SIZES.map((size) => <SelectItem key={size} value={String(size)}>{size} sản phẩm / lần</SelectItem>)}</SelectContent></Select></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Lần chạy tự động gần nhất</p><p className="mt-1 flex items-center gap-1 text-sm font-semibold"><CircleCheck className="h-4 w-4 text-emerald-600" />{autoSyncStatus?.lastRunStatus ? marketplaceAutoSyncStatusLabel(autoSyncStatus.lastRunStatus) : "Chưa chạy"}</p><p className="mt-1 text-xs text-muted-foreground">{autoSyncStatus?.lastRunAt ? new Date(autoSyncStatus.lastRunAt).toLocaleString("vi-VN") : "Lịch nền đã sẵn sàng"}</p></div></div>{autoSyncStatus?.lastRunSummary && <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">{autoSyncStatus.lastRunSummary}</p>}</CardContent>
    </Card>

    <Card className="settings-collapsible-panel" data-collapsed={collapsedSettingsSections.trash}>
      <CardHeader data-settings-header onClick={(event) => toggleSettingsSection("trash", event)}><CardTitle className="flex items-center gap-2"><TimerReset className="h-5 w-5 text-red-600" />Tự động dọn Thùng rác</CardTitle><CardDescription>Tự động xóa vĩnh viễn các mục đã nằm trong Thùng rác quá số ngày bạn chọn. Lịch này chỉ áp dụng cho dữ liệu của tài khoản bạn.</CardDescription></CardHeader>
      <CardContent className="space-y-4"><div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_auto]"><div><p className="text-sm font-semibold">Dọn dẹp tự động mỗi ngày</p><p className="text-xs text-muted-foreground">Mục đã khôi phục sẽ không bị dọn. Bạn vẫn có thể dọn thủ công trong Thùng rác bất cứ lúc nào.</p></div><div className="flex items-center gap-2"><Switch checked={Boolean(trashAutoCleanup?.isEnabled)} disabled={!trashAutoCleanup || updateTrashAutoCleanup.isPending} onCheckedChange={(isEnabled) => updateTrashAutoCleanup.mutate({ isEnabled })} /><span className="text-xs font-medium">{trashAutoCleanup?.isEnabled ? "Đang bật" : "Đang tắt"}</span></div></div><div className="grid gap-3 sm:grid-cols-2"><div><p className="mb-2 text-xs font-semibold text-muted-foreground">Giữ mục đã xóa trong</p><Select value={String(trashAutoCleanup?.retentionDays || 30)} disabled={!trashAutoCleanup || updateTrashAutoCleanup.isPending} onValueChange={(value) => updateTrashAutoCleanup.mutate({ retentionDays: Number(value) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TRASH_RETENTION_DAYS.map((days) => <SelectItem key={days} value={String(days)}>{days} ngày</SelectItem>)}</SelectContent></Select></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Lần dọn tự động gần nhất</p><p className="mt-1 flex items-center gap-1 text-sm font-semibold"><CircleCheck className={`h-4 w-4 ${trashAutoCleanup?.lastRunStatus === "failed" ? "text-red-600" : "text-emerald-600"}`} />{trashAutoCleanup?.lastRunStatus === "success" ? "Hoàn tất" : trashAutoCleanup?.lastRunStatus === "failed" ? "Không thành công" : trashAutoCleanup?.lastRunStatus === "skipped" ? "Đã bỏ qua" : "Chưa chạy"}</p><p className="mt-1 text-xs text-muted-foreground">{trashAutoCleanup?.lastRunAt ? new Date(trashAutoCleanup.lastRunAt).toLocaleString("vi-VN") : "Chạy hằng ngày khi bạn bật cấu hình"}</p></div></div>{trashAutoCleanup?.lastRunSummary && <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">{trashAutoCleanup.lastRunSummary}</p>}</CardContent>
    </Card>

    <Card className="settings-login-background-card settings-collapsible-panel" data-collapsed={collapsedSettingsSections.background}>
      <CardHeader data-settings-header onClick={(event) => toggleSettingsSection("background", event)}><CardTitle className="flex items-center gap-2"><ImageUp className="h-5 w-5 text-sky-400" />Nền đăng nhập</CardTitle><CardDescription>Tải ảnh PNG, JPEG hoặc WEBP tối đa 4 MB để thay nền đăng nhập trên thiết bị này.</CardDescription></CardHeader>
      <CardContent className="space-y-3"><div className="h-28 rounded-lg border bg-cover bg-center" style={{ backgroundImage: `linear-gradient(rgba(3, 7, 18, 0.15), rgba(3, 7, 18, 0.48)), url(${loginBackgroundUrl})` }}><div className="flex h-full items-end p-3"><span className="rounded bg-black/55 px-2 py-1 text-xs font-semibold text-white">Xem trước nền đăng nhập</span></div></div><div className="flex flex-col gap-2 sm:flex-row"><Input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploadLoginBackground.isPending} onChange={(event) => { uploadLoginBackgroundFile(event.target.files?.[0]); event.currentTarget.value = ""; }} /><Button type="button" variant="outline" disabled={uploadLoginBackground.isPending} onClick={resetLoginBackground}><TimerReset className="mr-1.5 h-4 w-4" />Nền mặc định</Button></div>{loginBackgroundDraft && <div className="space-y-3 rounded-lg border border-sky-500/25 bg-sky-500/5 p-3"><div className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-sky-400" /><p className="text-sm font-semibold">Cắt và chỉnh ảnh trước khi lưu</p></div><div className="relative aspect-video overflow-hidden rounded-md border bg-black"><img src={loginBackgroundDraft.source} alt="Bản xem trước ảnh nền đang chỉnh" className="h-full w-full object-cover" style={{ transform: `translate(${loginBackgroundDraft.edit.positionX * 12}%, ${loginBackgroundDraft.edit.positionY * 12}%) scale(${loginBackgroundDraft.edit.zoom})`, filter: `brightness(${loginBackgroundDraft.edit.brightness})` }} /></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-medium">Phóng to: {loginBackgroundDraft.edit.zoom.toFixed(1)}×<Input className="mt-1" type="range" min="1" max="2.5" step="0.1" value={loginBackgroundDraft.edit.zoom} onChange={(event) => updateLoginBackgroundEdit({ zoom: Number(event.target.value) })} /></label><label className="text-xs font-medium">Độ sáng: {Math.round(loginBackgroundDraft.edit.brightness * 100)}%<Input className="mt-1" type="range" min="0.6" max="1.4" step="0.05" value={loginBackgroundDraft.edit.brightness} onChange={(event) => updateLoginBackgroundEdit({ brightness: Number(event.target.value) })} /></label><label className="text-xs font-medium">Vị trí ngang<Input className="mt-1" type="range" min="-1" max="1" step="0.05" value={loginBackgroundDraft.edit.positionX} onChange={(event) => updateLoginBackgroundEdit({ positionX: Number(event.target.value) })} /></label><label className="text-xs font-medium">Vị trí dọc<Input className="mt-1" type="range" min="-1" max="1" step="0.05" value={loginBackgroundDraft.edit.positionY} onChange={(event) => updateLoginBackgroundEdit({ positionY: Number(event.target.value) })} /></label></div><div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="ghost" size="sm" onClick={() => setLoginBackgroundDraft(null)}>Hủy chỉnh ảnh</Button><Button type="button" size="sm" className="bg-red-600 hover:bg-red-700" disabled={uploadLoginBackground.isPending} onClick={() => void saveEditedLoginBackground()}>{uploadLoginBackground.isPending ? "Đang lưu" : "Lưu nền đã chỉnh"}</Button></div></div>}<p className="text-xs text-muted-foreground">{uploadLoginBackground.isPending ? "Đang tải ảnh nền lên..." : "Ảnh được cắt theo khung 16:9 và chỉ dùng làm nền đăng nhập cho trình duyệt này."}</p></CardContent>
    </Card>

    <Card className="settings-login-background-card settings-collapsible-panel" data-collapsed={collapsedSettingsSections.backgroundHistory}>
      <CardHeader data-settings-header onClick={(event) => toggleSettingsSection("backgroundHistory", event)}><CardTitle className="text-base">Nền đã tải gần đây</CardTitle><CardDescription>Chọn nhanh một trong tối đa sáu hình nền đã lưu trên thiết bị này.</CardDescription></CardHeader>
      <CardContent>{loginBackgroundHistory.length > 0 ? <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{loginBackgroundHistory.map((item) => <div key={item.url} className="relative aspect-video"><button type="button" aria-label="Dùng nền đã tải" onClick={() => selectLoginBackground(item.url)} className={`h-full w-full overflow-hidden rounded-md border transition ${loginBackgroundUrl === item.url ? "ring-2 ring-red-500" : "hover:border-sky-400"}`}><img src={item.url} alt="Nền đăng nhập đã tải" className="h-full w-full object-cover" /></button><button type="button" aria-label="Xóa nền khỏi danh sách gần đây" title="Xóa nền khỏi danh sách gần đây" onClick={() => setPendingBackgroundRemoval(item.url)} className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white shadow transition hover:bg-red-700"><Trash2 className="h-3.5 w-3.5" /></button></div>)}</div> : <p className="rounded-lg border border-dashed px-3 py-5 text-center text-sm text-muted-foreground">Chưa có hình nền tùy chỉnh. Hãy tải và lưu ảnh đầu tiên ở mục Nền đăng nhập.</p>}</CardContent>
    </Card>

    <Card className="settings-login-background-card settings-collapsible-panel" data-collapsed={collapsedSettingsSections.backgroundDaily}>
      <CardHeader data-settings-header onClick={(event) => toggleSettingsSection("backgroundDaily", event)}><CardTitle className="text-base">Nền ngẫu nhiên mỗi ngày</CardTitle><CardDescription>Tự chọn một ảnh khác mỗi ngày từ các nền bạn đã tải lên.</CardDescription></CardHeader>
      <CardContent className="space-y-3"><div className="flex items-center justify-between gap-4 rounded-lg border p-3"><div><p className="text-sm font-semibold">Đổi nền tự động mỗi ngày</p><p className="mt-1 text-xs text-muted-foreground">{loginBackgroundDailyEligibleUrls.length > 0 ? "Ảnh được chọn theo ngày trên thiết bị này khi mở màn hình đăng nhập." : "Hãy chọn ít nhất một ảnh bên dưới để bật tính năng này."}</p></div><Switch checked={loginBackgroundDailyRandom} disabled={loginBackgroundDailyEligibleUrls.length === 0} onCheckedChange={updateLoginBackgroundDailyRandom} aria-label="Bật đổi nền ngẫu nhiên mỗi ngày" /></div>{loginBackgroundHistory.length > 0 && <div><p className="mb-2 text-xs font-semibold text-muted-foreground">Ảnh tham gia vòng quay</p><div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{loginBackgroundHistory.map((item) => { const isEligible = loginBackgroundDailyEligibleUrls.includes(item.url); return <button key={item.url} type="button" aria-pressed={isEligible} onClick={() => toggleLoginBackgroundDailyEligible(item.url)} className={`relative aspect-video overflow-hidden rounded-md border text-left transition ${isEligible ? "ring-2 ring-emerald-500" : "opacity-45 hover:opacity-75"}`}><img src={item.url} alt="Ảnh nền trong vòng quay hằng ngày" className="h-full w-full object-cover" /><span className={`absolute inset-x-0 bottom-0 px-1.5 py-1 text-center text-[10px] font-semibold text-white ${isEligible ? "bg-emerald-600/90" : "bg-black/70"}`}>{isEligible ? "Đang dùng" : "Đã loại trừ"}</span></button>; })}</div></div>}</CardContent>
    </Card>

    <AlertDialog open={deleteSourceId !== null} onOpenChange={(open) => !open && setDeleteSourceId(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xóa nguồn theo dõi?</AlertDialogTitle><AlertDialogDescription>Nguồn sẽ không còn được kiểm tra tự động. Các Chyusen và audit log hiện có vẫn được giữ nguyên.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Hủy</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteSourceId && deleteSource.mutate({ id: deleteSourceId })}>Xóa nguồn</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <AlertDialog open={pendingBackgroundRemoval !== null} onOpenChange={(open) => !open && setPendingBackgroundRemoval(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle><AlertDialogDescription>Hình nền sẽ bị xóa khỏi danh sách gần đây trên thiết bị này. Nếu đây là nền đang dùng, ứng dụng sẽ chuyển về nền mặc định.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Hủy</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => { if (pendingBackgroundRemoval) removeRecentLoginBackground(pendingBackgroundRemoval); setPendingBackgroundRemoval(null); }}>Xóa nền</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
