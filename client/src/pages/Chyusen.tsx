import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { CalendarClock, CheckCircle2, CircleAlert, CircleArrowUp, Clock3, ExternalLink, FileSearch, Gift, ImageUp, Link2, Pencil, Plus, QrCode, Radio, RotateCcw, Search, Sparkles, Ticket, ToggleLeft, ToggleRight, Trophy, Trash2, XCircle } from "lucide-react";
import jsQR from "jsqr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { EMPTY_CHYUSEN_DRAFT, toChyusenDraft, type ChyusenDraft } from "@/lib/chyusenDraft";
import { buildChyusenSubmission } from "../lib/chyusenSubmission";
import { formatChyusenDayMonth, formatChyusenDayMonthInput, formatChyusenDaysRemaining, getChyusenDeadlineTone, isChyusenDeadlineToday, isChyusenRegistrationExpired, isChyusenResultReady } from "@shared/chyusenDate";
import { CHYUSEN_STATUS_FILTER_OPTIONS, countChyusenStatusFilters, matchesChyusenStatusFilter } from "@shared/chyusenStatusFilter";
import { prioritizeChyusenDeadlineToday, sortChyusenByNearestResultDate } from "@shared/chyusenListOrder";
import { getChyusenAiFilledFields } from "@shared/chyusenAiFields";
import { createChyusenPreviewFallback } from "@shared/chyusenPreview";
import { validateChyusenManualDraft, type ChyusenManualValidationErrors } from "@shared/chyusenManualValidation";
import { TRADING_CARD_SERIES, tradingCardSeriesLabel } from "@shared/tradingCardSeries";
import { formatChyusenResultCountdown, isChyusenResultAnnouncementToday, isChyusenResultCheckOverdue } from "@shared/chyusenResultReminder";
import { detectChyusenShopFromQrUrl, detectChyusenShopFromUrl, normalizeChyusenQrUrl } from "@shared/chyusenQr";
import { resolveChyusenDefaultFilter } from "@shared/chyusenDefaultFilter";
import { ADD_CUSTOM_CHYUSEN_SHOP_VALUE, DEFAULT_CHYUSEN_SHOPS } from "@shared/chyusenShops";
import { ProductNameSuggestions } from "@/components/ProductNameSuggestions";

const CHYUSEN_TOAST_DURATION = 8_000;
const FIRST_CHYUSEN_ERROR_FIELDS = ["productName", "shop", "customShopName", "applicationEnd", "resultDate", "title"] as const;
type FirstChyusenErrorField = typeof FIRST_CHYUSEN_ERROR_FIELDS[number];

function ToastCountdown({ tone = "success" }: { tone?: "success" | "destructive" }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setProgress(Math.max(0, 100 - ((Date.now() - startedAt) / CHYUSEN_TOAST_DURATION) * 100));
    }, 80);
    return () => window.clearInterval(timer);
  }, []);

  return <Progress value={progress} className={tone === "destructive" ? "mt-2 h-1 [&>[data-slot=progress-indicator]]:bg-red-500" : "mt-2 h-1 [&>[data-slot=progress-indicator]]:bg-emerald-500"} />;
}

function displayDate(value: Date | string | null | undefined) {
  return formatChyusenDayMonth(value) || "Chưa có thông tin";
}

function displayChyusenShop(entry: { shop?: string | null; customShopName?: string | null }) {
  return entry.customShopName?.trim() || entry.shop?.trim() || "Khác";
}

async function prepareChyusenImage(file: File): Promise<string> {
  if (!window.createImageBitmap) {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Không thể đọc ảnh"));
      reader.onerror = () => reject(new Error("Không thể đọc ảnh"));
      reader.readAsDataURL(file);
    });
  }
  const bitmap = await window.createImageBitmap(file);
  const longestSide = Math.max(bitmap.width, bitmap.height);
  const compressionProfiles = file.size > 6 * 1024 * 1024
    ? [{ longestSide: 1800, quality: 0.8 }, { longestSide: 1500, quality: 0.74 }, { longestSide: 1280, quality: 0.7 }]
    : [{ longestSide: 1600, quality: 0.84 }, { longestSide: 1400, quality: 0.78 }, { longestSide: 1200, quality: 0.72 }];
  let preparedImage = "";
  for (const profile of compressionProfiles) {
    const scale = Math.min(1, profile.longestSide / longestSide);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Không thể chuẩn bị ảnh");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    preparedImage = canvas.toDataURL("image/jpeg", profile.quality);
    if (preparedImage.length <= 2_600_000) break;
  }
  bitmap.close();
  return preparedImage;
}

type ChyusenQrScan = { url: string; cropDataUrl: string };

async function scanQrFromImageDataUrl(imageDataUrl: string): Promise<ChyusenQrScan | null> {
  const image = new Image();
  image.src = imageDataUrl;
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Không thể quét QR")); });
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(image, 0, 0);
  const qr = jsQR(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, { inversionAttempts: "attemptBoth" });
  const url = normalizeChyusenQrUrl(qr?.data);
  if (!url || !qr?.location) return null;
  const corners = [qr.location.topLeftCorner, qr.location.topRightCorner, qr.location.bottomRightCorner, qr.location.bottomLeftCorner];
  const minX = Math.min(...corners.map((corner) => corner.x));
  const maxX = Math.max(...corners.map((corner) => corner.x));
  const minY = Math.min(...corners.map((corner) => corner.y));
  const maxY = Math.max(...corners.map((corner) => corner.y));
  const padding = Math.max(24, Math.round(Math.max(maxX - minX, maxY - minY) * 0.22));
  const sourceX = Math.max(0, Math.floor(minX - padding));
  const sourceY = Math.max(0, Math.floor(minY - padding));
  const sourceWidth = Math.min(canvas.width - sourceX, Math.ceil(maxX - minX + padding * 2));
  const sourceHeight = Math.min(canvas.height - sourceY, Math.ceil(maxY - minY + padding * 2));
  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = sourceWidth;
  cropCanvas.height = sourceHeight;
  const cropContext = cropCanvas.getContext("2d");
  if (!cropContext) return { url, cropDataUrl: imageDataUrl };
  cropContext.drawImage(canvas, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);
  return { url, cropDataUrl: cropCanvas.toDataURL("image/jpeg", 0.9) };
}

function timeBadge(timeState: string) {
  const labels: Record<string, { label: string; className: string }> = {
    upcoming: { label: "Sắp mở", className: "border-sky-300 bg-sky-50 text-sky-800" },
    open: { label: "Đang đăng ký", className: "border-emerald-300 bg-emerald-50 text-emerald-800" },
    expiring: { label: "Sắp hết hạn", className: "border-amber-300 bg-amber-50 text-amber-900" },
    expired: { label: "Đã hết hạn", className: "border-red-300 bg-red-50 text-red-800" },
    waiting_result: { label: "Chờ kết quả", className: "border-blue-300 bg-blue-50 text-blue-800" },
    result_ready: { label: "Đến ngày công bố", className: "border-violet-300 bg-violet-50 text-violet-800" },
  };
  const value = labels[timeState] || labels.expired;
  return <Badge variant="outline" className={value.className}>{value.label}</Badge>;
}

function participationBadge(status: string) {
  const labels: Record<string, { label: string; className: string }> = {
    not_registered: { label: "Chưa đăng ký", className: "border-slate-300 bg-slate-50 text-slate-700" },
    registered: { label: "Đã đăng ký", className: "border-emerald-300 bg-emerald-50 text-emerald-800" },
    cancelled: { label: "Đã hủy", className: "border-slate-400 bg-slate-100 text-slate-700" },
    won: { label: "Đã trúng", className: "border-red-400 bg-red-500/20 text-red-200" },
    lost: { label: "Đã trượt", className: "border-zinc-400 bg-zinc-100 text-zinc-800" },
    not_participating: { label: "Không tham gia", className: "border-slate-300 bg-slate-50 text-slate-600" },
  };
  const value = labels[status] || labels.not_registered;
  return <Badge variant="outline" className={value.className}>{value.label}</Badge>;
}

export default function Chyusen() {
  const [location, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data: entries = [], isLoading } = trpc.chyusen.list.useQuery();
  const { data: shopSuggestionDetails = [] } = trpc.chyusen.shopSuggestionDetails.useQuery();
  const { data: sources = [] } = trpc.chyusen.sources.useQuery();
  const { data: sourceHistory = [] } = trpc.chyusen.sourceHistory.useQuery();
  const { data: notificationSettings } = trpc.chyusen.notificationSettings.useQuery();
  const resultAnnouncementToday = entries.filter((entry: any) => isChyusenResultAnnouncementToday(entry));
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"deadline" | "resultDate">("resultDate");
  const [showDialog, setShowDialog] = useState(false);
  const [draft, setDraft] = useState<ChyusenDraft>(EMPTY_CHYUSEN_DRAFT);
  const dateFieldsRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [winConfirmEntry, setWinConfirmEntry] = useState<any | null>(null);
  const [undoWinEntry, setUndoWinEntry] = useState<any | null>(null);
  const [fullTitleEntry, setFullTitleEntry] = useState<{ id: number; title: string } | null>(null);
  const [showSourceDialog, setShowSourceDialog] = useState(false);
  const [editingSourceId, setEditingSourceId] = useState<number | null>(null);
  const [deleteSourceId, setDeleteSourceId] = useState<number | null>(null);
  const [sourceDraft, setSourceDraft] = useState<{ label: string; sourceUrl: string; checkIntervalMinutes: 60 | 180 | 360 | 720 | 1440; isActive: boolean }>({ label: "", sourceUrl: "", checkIntervalMinutes: 360, isActive: true });
  const [validationErrors, setValidationErrors] = useState<ChyusenManualValidationErrors>({});
  const [firstValidationError, setFirstValidationError] = useState<FirstChyusenErrorField | null>(null);
  const [aiFilledFields, setAiFilledFields] = useState<Array<keyof ChyusenDraft>>([]);
  const [aiFieldConfidence, setAiFieldConfidence] = useState<Partial<Record<keyof ChyusenDraft, "high" | "medium" | "low">>>({});
  const [aiFieldEvidence, setAiFieldEvidence] = useState<Partial<Record<keyof ChyusenDraft, string>>>({});
  const [aiProposal, setAiProposal] = useState<{ draft: ChyusenDraft; fields: Array<keyof ChyusenDraft>; confidence: Partial<Record<keyof ChyusenDraft, "high" | "medium" | "low">>; evidence: Partial<Record<keyof ChyusenDraft, string>>; imageCount: number } | null>(null);
  const [aiDraftBackup, setAiDraftBackup] = useState<ChyusenDraft | null>(null);
  const [aiRetryHint, setAiRetryHint] = useState(false);
  const [qrRegistrationUrl, setQrRegistrationUrl] = useState<string | null>(null);
  const [qrDetectedShop, setQrDetectedShop] = useState<string | null>(null);
  const [qrCropPreviews, setQrCropPreviews] = useState<string[]>([]);
  const [pendingQrAnalysis, setPendingQrAnalysis] = useState<{ imageDataUrls: string[]; fullImageCount: number } | null>(null);
  const [showQrPreview, setShowQrPreview] = useState(false);
  const [imageAnalysisMode, setImageAnalysisMode] = useState<"image" | "qr">("image");
  const imageUploadInputRef = useRef<HTMLInputElement>(null);
  const [showCameraQrDialog, setShowCameraQrDialog] = useState(false);
  const [cameraQrStatus, setCameraQrStatus] = useState<"idle" | "requesting" | "scanning" | "detected" | "error">("idle");
  const [cameraQrError, setCameraQrError] = useState<string | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraAnimationFrameRef = useRef<number | null>(null);
  const [deadlineTooltipId, setDeadlineTooltipId] = useState<number | null>(null);
  const [showTodayTooltip] = useState(() => new URLSearchParams(window.location.search).get("tooltip") === "today");
  const urlSuggestedShop = detectChyusenShopFromUrl(draft.sourceUrl);
  const chyusenCompletionSteps = useMemo(() => [
    { label: "Sản phẩm", complete: Boolean(draft.productName.trim()) },
    { label: "Cửa hàng", complete: Boolean((draft.shop === ADD_CUSTOM_CHYUSEN_SHOP_VALUE ? draft.customShopName : draft.shop).trim()) },
    { label: "Hạn đăng ký", complete: Boolean(draft.applicationEnd) },
    { label: "Ngày kết quả", complete: Boolean(draft.resultDate) },
  ], [draft.applicationEnd, draft.customShopName, draft.productName, draft.resultDate, draft.shop]);
  const completedChyusenSteps = chyusenCompletionSteps.filter((step) => step.complete).length;
  const chyusenCompletionPercent = Math.round((completedChyusenSteps / chyusenCompletionSteps.length) * 100);
  const shopOptions = useMemo(() => Array.from(new Set([
    ...DEFAULT_CHYUSEN_SHOPS,
    ...shopSuggestionDetails.map((shop: any) => String(shop.name || "").trim()).filter(Boolean),
  ])), [shopSuggestionDetails]);

  useEffect(() => {
    document.body.dataset.chyusenFormOpen = showDialog ? "true" : "false";
    return () => { delete document.body.dataset.chyusenFormOpen; };
  }, [showDialog]);

  const stopCameraQrScanner = () => {
    if (cameraAnimationFrameRef.current !== null) window.cancelAnimationFrame(cameraAnimationFrameRef.current);
    cameraAnimationFrameRef.current = null;
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null;
  };

  useEffect(() => () => stopCameraQrScanner(), []);
  useEffect(() => { if (!showDialog) stopCameraQrScanner(); }, [showDialog]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setFilter(resolveChyusenDefaultFilter(window.location.search));
    if (query.get("new") === "1") {
      setEditingId(null);
      setDraft(EMPTY_CHYUSEN_DRAFT);
      setShowDialog(true);
      if (query.get("focus") === "dates") {
        window.setTimeout(() => dateFieldsRef.current?.scrollIntoView({ block: "start" }), 100);
      }
    }
  }, [location]);

  const invalidate = () => {
    utils.chyusen.list.invalidate();
    utils.chyusen.shopSuggestionDetails.invalidate();
    utils.chyusen.notifications.invalidate();
    utils.chyusen.sources.invalidate();
    utils.chyusen.sourceHistory.invalidate();
    utils.chyusen.notificationSettings.invalidate();
    utils.dashboard.stats.invalidate();
    utils.trash.list.invalidate();
  };
  const openChyusenDetails = async (id: number) => {
    try {
      const entry = await utils.chyusen.get.fetch({ id });
      if (!entry) throw new Error("Không tìm thấy Chyusen để xem chi tiết.");
      setEditingId(entry.id);
      setDraft(toChyusenDraft(entry));
      setValidationErrors({});
      resetAiDraftState();
      setShowDialog(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể mở chi tiết Chyusen.");
    }
  };
  const showChyusenSavedToast = (message: string, entryId: number) => toast.success(message, {
    duration: CHYUSEN_TOAST_DURATION,
    description: <ToastCountdown />,
    action: { label: "Xem chi tiết", onClick: () => { void openChyusenDetails(entryId); } },
  });
  const previewUrl = trpc.chyusen.previewUrl.useMutation({
    onSuccess: (data) => {
      setAiFilledFields([]); setAiFieldConfidence({}); setAiDraftBackup(null);
      setDraft(toChyusenDraft(data));
      toast.success(data.parserStatus === "detected" ? "Đã đọc thông tin. Hãy kiểm tra trước khi lưu." : "Đã đọc được một phần thông tin. Hãy bổ sung các trường còn thiếu.");
    },
    onError: () => {
      setDraft((current) => createChyusenPreviewFallback(current));
      toast.error("Không thể đọc link. Hãy nhập thủ công rồi lưu.");
    },
  });
  const create = trpc.chyusen.create.useMutation({
    onSuccess: (data) => { showChyusenSavedToast("Đã lưu và ghi nhận Đã đăng ký. Chyusen đang chờ kết quả.", data.id); setShowDialog(false); setDraft(EMPTY_CHYUSEN_DRAFT); setValidationErrors({}); invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const update = trpc.chyusen.update.useMutation({
    onSuccess: (_data, variables) => { showChyusenSavedToast("Đã cập nhật Chyusen thành công.", variables.id); setShowDialog(false); setEditingId(null); setDraft(EMPTY_CHYUSEN_DRAFT); setValidationErrors({}); invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const restore = trpc.chyusen.restore.useMutation({
    onSuccess: (data) => { showChyusenSavedToast(`Đã hoàn tác xóa ${data.title}.`, data.id); invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const remove = trpc.chyusen.delete.useMutation({
    onSuccess: (data) => {
      toast.success(`Đã xóa ${data.title}.`, {
        duration: CHYUSEN_TOAST_DURATION,
        description: <ToastCountdown tone="destructive" />,
        action: { label: "Hoàn tác", onClick: () => restore.mutate({ id: data.id }) },
      });
      setDeleteId(null);
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const setParticipation = trpc.chyusen.setParticipation.useMutation({
    onSuccess: (data: any) => { setWinConfirmEntry(null); toast.success(data?.trashed ? "Đã trượt. Chyusen đã được chuyển vào Thùng rác." : "Đã cập nhật trạng thái."); invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const undoWon = trpc.chyusen.undoWon.useMutation({
    onSuccess: () => { setUndoWinEntry(null); toast.success("Đã hoàn tác trạng thái Đã trúng. Chyusen quay lại Đã đăng ký."); invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const purchaseDraft = trpc.chyusen.purchaseDraft.useMutation({
    onSuccess: (data) => {
      localStorage.setItem("tcg-manager-chyusen-purchase-draft", JSON.stringify(data));
      setLocation("/mua-hang");
    },
    onError: (error) => toast.error(error.message),
  });
  const markPurchaseCreated = trpc.chyusen.markPurchaseCreated.useMutation({
    onSuccess: () => { toast.success("Đã xác nhận mua hàng. Chyusen đã hoàn tất."); invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const updateNotificationSettings = trpc.chyusen.updateNotificationSettings.useMutation({ onSuccess: () => { utils.chyusen.notificationSettings.invalidate(); toast.success("Đã cập nhật cài đặt nhắc hạn."); }, onError: (error) => toast.error(error.message) });
  const createSource = trpc.chyusen.createSource.useMutation({ onSuccess: () => { toast.success("Đã lưu nguồn theo dõi."); setShowSourceDialog(false); setSourceDraft({ label: "", sourceUrl: "", checkIntervalMinutes: 360, isActive: true }); utils.chyusen.sources.invalidate(); }, onError: (error) => toast.error(error.message) });
  const updateSource = trpc.chyusen.updateSource.useMutation({ onSuccess: () => { toast.success("Đã cập nhật nguồn theo dõi."); utils.chyusen.sources.invalidate(); }, onError: (error) => toast.error(error.message) });
  const deleteSource = trpc.chyusen.deleteSource.useMutation({ onSuccess: () => { toast.success("Đã xóa nguồn theo dõi."); setDeleteSourceId(null); invalidate(); }, onError: (error) => toast.error(error.message) });
  const analyzeImages = trpc.chyusen.analyzeImages.useMutation({
    onSuccess: (data, variables) => {
      const extracted = toChyusenDraft({ ...data, parserStatus: "partial", parserNote: data.note, fieldConfidence: {} });
      const detectedFields = getChyusenAiFilledFields({
        title: data.title, productName: data.productName, series: data.series, productType: data.productType, shop: data.shop,
        price: data.price, quantityLimit: data.quantityLimit, applicationStart: extracted.applicationStart, applicationEnd: extracted.applicationEnd,
        resultDate: extracted.resultDate, pickupStart: extracted.pickupStart, pickupNote: data.pickupNote, requirements: data.requirements,
      }) as Array<keyof ChyusenDraft>;
      setDraft((current) => {
        const next = { ...current, title: data.title || current.title, productName: data.productName || current.productName, series: data.series || current.series, productType: data.productType || current.productType, shop: data.shop || current.shop, price: data.price === null ? current.price : String(data.price), quantityLimit: data.quantityLimit || current.quantityLimit, applicationStart: extracted.applicationStart || current.applicationStart, applicationEnd: extracted.applicationEnd || current.applicationEnd, resultDate: extracted.resultDate || current.resultDate, pickupStart: extracted.pickupStart || current.pickupStart, pickupNote: data.pickupNote || current.pickupNote, requirements: data.requirements || current.requirements, parserStatus: "partial" as const, parserNote: data.note || "AI đã đọc ảnh. Hãy kiểm tra lại trước khi lưu." };
        const confidence = Object.fromEntries(detectedFields.map((field) => [field, data.fieldConfidence[field] || "medium"])) as Partial<Record<keyof ChyusenDraft, "high" | "medium" | "low">>;
        const evidence = Object.fromEntries(detectedFields.map((field) => [field, data.fieldEvidence?.[field] || ""]).filter(([, value]) => Boolean(value))) as Partial<Record<keyof ChyusenDraft, string>>;
        setAiProposal({ draft: next, fields: detectedFields, confidence, evidence, imageCount: variables.imageDataUrls.length });
        return current;
      });
      toast.success(`AI đã đọc ${variables.imageDataUrls.length} ảnh. Hãy so sánh trước khi áp dụng.`);
    },
    onError: (error) => toast.error(error.message || "Không thể đọc ảnh. Hãy thử ảnh rõ hơn."),
  });

  const statusFilterCounts = useMemo(() => countChyusenStatusFilters(entries), [entries]);
  const filteredEntries = useMemo(() => {
    const matchingEntries = entries.filter((entry: any) => {
    const normalizedSearch = search.trim().toLowerCase();
    const matchesSearch = !normalizedSearch || [entry.title, entry.productName, entry.shop, entry.customShopName, entry.series].some((value) => String(value || "").toLowerCase().includes(normalizedSearch));
    const matchesFilter = matchesChyusenStatusFilter(entry, filter);
    return matchesSearch && matchesFilter;
    });
    return sortOrder === "resultDate" ? sortChyusenByNearestResultDate(matchingEntries) : prioritizeChyusenDeadlineToday(matchingEntries);
  }, [entries, filter, search, sortOrder]);
  const sourceLabelForHistory = (sourceId: number, entryId?: number | null) => {
    const sourceLabel = sources.find((source: any) => source.id === sourceId)?.label || `Nguồn #${sourceId}`;
    const entryLabel = entryId ? entries.find((entry: any) => entry.id === entryId)?.title || `Chyusen #${entryId}` : null;
    return entryLabel ? `${sourceLabel} · ${entryLabel}` : sourceLabel;
  };

  const updateDraft = <K extends keyof ChyusenDraft>(key: K, value: ChyusenDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setAiFilledFields((current) => current.filter((field) => field !== key));
    setAiFieldConfidence((current) => { const next = { ...current }; delete next[key]; return next; });
    setAiFieldEvidence((current) => { const next = { ...current }; delete next[key]; return next; });
    if (["title", "productName", "applicationEnd", "resultDate"].includes(String(key))) {
      setValidationErrors((current) => ({ ...current, [key]: undefined }));
    }
    setFirstValidationError((current) => current === key ? null : current);
  };
  const runImageAnalysis = (imageDataUrls: string[]) => {
    const retryHintTimer = window.setTimeout(() => setAiRetryHint(true), 1_800);
    analyzeImages.mutate({ imageDataUrls }, { onSettled: () => { window.clearTimeout(retryHintTimer); setAiRetryHint(false); } });
  };
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    if (files.length > 4 || files.some((file) => !/image\/(png|jpeg|webp)/.test(file.type) || file.size > 10 * 1024 * 1024) || files.reduce((total, file) => total + file.size, 0) > 40 * 1024 * 1024) { toast.error("Chỉ tải 1–4 ảnh PNG, JPEG hoặc WEBP, tối đa 10 MB/ảnh và 40 MB tổng."); return; }
    try {
      const imageDataUrls = await Promise.all(files.map(prepareChyusenImage));
      let imageDataUrlsForAi = imageDataUrls;
      if (imageAnalysisMode === "qr") {
        const qrScans = await Promise.all(imageDataUrls.map((imageDataUrl) => scanQrFromImageDataUrl(imageDataUrl).catch(() => null)));
        const firstQrScan = qrScans.find((scan): scan is ChyusenQrScan => Boolean(scan));
        const firstQrUrl = firstQrScan?.url;
        setQrRegistrationUrl(firstQrUrl || null);
        const detectedShop = detectChyusenShopFromQrUrl(firstQrUrl);
        setQrDetectedShop(detectedShop);
        if (detectedShop) updateDraft("shop", detectedShop);
        const qrCrops = qrScans.filter((scan): scan is ChyusenQrScan => Boolean(scan)).map((scan) => scan.cropDataUrl);
        imageDataUrlsForAi = [...imageDataUrls, ...qrCrops].slice(0, 8);
        setQrCropPreviews(qrCrops);
        if (firstQrUrl) {
          setPendingQrAnalysis({ imageDataUrls: imageDataUrlsForAi, fullImageCount: imageDataUrls.length });
          toast.success("Đã tìm thấy QR và cắt vùng mã. Hãy kiểm tra trước khi gửi AI.");
          return;
        }
        toast.info("Không tìm thấy QR rõ ràng. AI vẫn đang đọc đầy đủ nội dung ảnh.");
      } else {
        setQrRegistrationUrl(null);
        setQrDetectedShop(null);
        setQrCropPreviews([]);
        setPendingQrAnalysis(null);
      }
      runImageAnalysis(imageDataUrlsForAi);
    } catch { toast.error("Không thể đọc tệp ảnh này."); }
  };
  const startCameraQrScanner = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraQrStatus("error");
      setCameraQrError("Thiết bị hoặc trình duyệt này không hỗ trợ mở camera. Hãy dùng tải ảnh để quét QR.");
      return;
    }
    stopCameraQrScanner();
    setCameraQrError(null);
    setCameraQrStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      if (!showCameraQrDialog) { stream.getTracks().forEach((track) => track.stop()); return; }
      cameraStreamRef.current = stream;
      const video = cameraVideoRef.current;
      if (!video) throw new Error("Không thể hiển thị camera.");
      video.srcObject = stream;
      await video.play();
      setCameraQrStatus("scanning");
      const canvas = document.createElement("canvas");
      const scanFrame = () => {
        const activeVideo = cameraVideoRef.current;
        if (!activeVideo || !cameraStreamRef.current) return;
        if (activeVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && activeVideo.videoWidth > 0) {
          canvas.width = activeVideo.videoWidth;
          canvas.height = activeVideo.videoHeight;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          if (context) {
            context.drawImage(activeVideo, 0, 0, canvas.width, canvas.height);
            const qr = jsQR(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, { inversionAttempts: "attemptBoth" });
            const qrUrl = normalizeChyusenQrUrl(qr?.data);
            if (qrUrl) {
              setQrRegistrationUrl(qrUrl);
              const detectedShop = detectChyusenShopFromQrUrl(qrUrl);
              setQrDetectedShop(detectedShop);
              if (detectedShop) updateDraft("shop", detectedShop);
              stopCameraQrScanner();
              setCameraQrStatus("detected");
              setShowCameraQrDialog(false);
              setShowQrPreview(true);
              toast.success("Đã quét mã QR. Hãy kiểm tra liên kết trước khi áp dụng.");
              return;
            }
          }
        }
        cameraAnimationFrameRef.current = window.requestAnimationFrame(scanFrame);
      };
      cameraAnimationFrameRef.current = window.requestAnimationFrame(scanFrame);
    } catch (error) {
      stopCameraQrScanner();
      setCameraQrStatus("error");
      const name = error instanceof DOMException ? error.name : "";
      setCameraQrError(name === "NotAllowedError" ? "Bạn đã từ chối quyền camera. Hãy cấp quyền camera trong trình duyệt rồi thử lại." : "Không thể mở camera. Hãy kiểm tra quyền truy cập hoặc dùng tải ảnh để quét QR.");
    }
  };
  const openNewSource = () => { setEditingSourceId(null); setSourceDraft({ label: "", sourceUrl: "", checkIntervalMinutes: 360, isActive: true }); setShowSourceDialog(true); };
  const openEditSource = (source: any) => { setEditingSourceId(source.id); setSourceDraft({ label: source.label || "", sourceUrl: source.sourceUrl || "", checkIntervalMinutes: source.checkIntervalMinutes || 360, isActive: Boolean(source.isActive) }); setShowSourceDialog(true); };
  const saveSource = () => {
    if (editingSourceId) {
      updateSource.mutate({ id: editingSourceId, ...sourceDraft }, { onSuccess: () => { toast.success("Đã sửa nguồn theo dõi."); setShowSourceDialog(false); setEditingSourceId(null); invalidate(); } });
    } else {
      createSource.mutate({ label: sourceDraft.label, sourceUrl: sourceDraft.sourceUrl, checkIntervalMinutes: sourceDraft.checkIntervalMinutes });
    }
  };
  const focusChyusenErrorField = (field: FirstChyusenErrorField) => {
    const target = document.querySelector<HTMLElement>(`[data-chyusen-field="${field}"] input, [data-chyusen-field="${field}"] button`);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    target?.focus({ preventScroll: true });
    const fieldContainer = target?.closest<HTMLElement>(`[data-chyusen-field="${field}"]`);
    fieldContainer?.classList.remove("chyusen-error-attention");
    void fieldContainer?.offsetWidth;
    fieldContainer?.classList.add("chyusen-error-attention");
    window.setTimeout(() => fieldContainer?.classList.remove("chyusen-error-attention"), 720);
  };
  const submit = () => {
    const draftForSubmission = { ...draft, title: draft.productName.trim() || draft.title };
    const errors = validateChyusenManualDraft(draftForSubmission);
    setValidationErrors(errors);
    if (Object.keys(errors).length) {
      toast.error("Vui lòng hoàn tất các trường bắt buộc trước khi lưu.");
      const firstErrorField = FIRST_CHYUSEN_ERROR_FIELDS.find((field) => Boolean(errors[field]));
      setFirstValidationError(firstErrorField ?? null);
      window.setTimeout(() => {
        if (!firstErrorField) return;
        focusChyusenErrorField(firstErrorField);
      }, 0);
      return;
    }
    setFirstValidationError(null);
    let payload;
    try {
      payload = buildChyusenSubmission(draftForSubmission);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ngày tháng không hợp lệ.");
      return;
    }
    if (editingId) update.mutate({ id: editingId, data: payload });
    else create.mutate({ ...payload, applicationStatus: "registered", resultStatus: "pending" });
  };
  const focusFirstAiField = () => window.setTimeout(() => document.querySelector<HTMLElement>("[data-ai-filled='true'] input, [data-ai-filled='true'] button")?.focus(), 0);
  const applyAiProposal = () => { if (!aiProposal) return; setAiDraftBackup(draft); setDraft(aiProposal.draft); setAiFilledFields(aiProposal.fields); setAiFieldConfidence(aiProposal.confidence); setAiFieldEvidence(aiProposal.evidence); setAiProposal(null); toast.success("Đã áp dụng dữ liệu AI. Bạn vẫn có thể sửa trước khi lưu."); };
  const acceptAiDraft = () => { setAiFilledFields([]); setAiFieldConfidence({}); setAiFieldEvidence({}); setAiDraftBackup(null); toast.success("Đã chấp nhận dữ liệu AI. Bạn vẫn có thể sửa trước khi lưu."); };
  const undoAiDraft = () => { if (!aiDraftBackup) return; setDraft(aiDraftBackup); setAiFilledFields([]); setAiFieldConfidence({}); setAiFieldEvidence({}); setAiDraftBackup(null); toast.info("Đã hoàn tác dữ liệu AI vừa điền."); };
  const resetAiDraftState = () => { setAiFilledFields([]); setAiFieldConfidence({}); setAiFieldEvidence({}); setAiDraftBackup(null); setAiProposal(null); };
  const openNew = () => { setEditingId(null); setDraft(EMPTY_CHYUSEN_DRAFT); setValidationErrors({}); resetAiDraftState(); setShowDialog(true); };
  const openEdit = (entry: any) => { setEditingId(entry.id); setDraft(toChyusenDraft(entry)); setValidationErrors({}); resetAiDraftState(); setShowDialog(true); };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3"><Ticket className="h-7 w-7 text-red-600" /><h1 className="text-2xl font-bold text-foreground">抽選</h1></div>
          <p className="mt-1 text-sm text-muted-foreground">Lottery / Chūsen — dán link công khai, kiểm tra thông tin rồi lưu để theo dõi hạn đăng ký.</p>
        </div>
        <Button className="bg-red-600 text-white hover:bg-red-700" onClick={openNew}><Plus className="mr-2 h-4 w-4" /><span className="rgb-action-label">Thêm 抽選</span></Button>
      </div>

      <Card className="border-red-500/70 bg-red-950/70 shadow-[0_0_0_1px_rgba(239,68,68,0.16)]">
        <CardContent className="flex gap-3 p-4 text-sm text-red-100"><FileSearch className="mt-0.5 h-5 w-5 shrink-0 text-red-400" /><p><strong className="text-red-300">Tự động tối đa, không tự đoán.</strong> Hệ thống chỉ đọc nguồn công khai được hỗ trợ. Thông tin lấy từ link luôn cần bạn kiểm tra và xác nhận trước khi lưu; website yêu cầu đăng nhập hoặc CAPTCHA sẽ không bị vượt qua.</p></CardContent>
      </Card>

      {resultAnnouncementToday.length > 0 && (
        <Card className="border-violet-300 bg-violet-500/10 shadow-[0_0_0_1px_rgba(196,181,253,0.18)]">
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base text-violet-100"><Trophy className="h-4 w-4 text-yellow-300" />Hôm nay có kết quả Chyusen ({resultAnnouncementToday.length})</CardTitle><CardDescription className="text-violet-200/85">Kiểm tra kết quả từ cửa hàng trước khi đánh dấu Đã trúng hoặc Đã trượt.</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">{resultAnnouncementToday.slice(0, 4).map((entry: any) => <Button key={entry.id} type="button" size="sm" variant="outline" className="w-full min-w-0 max-w-full justify-start border-violet-300/60 text-violet-100 hover:bg-violet-500/20 sm:w-auto" onClick={() => openEdit(entry)}><span className="min-w-0 flex-1 truncate text-left">{entry.title}</span><span className="ml-2 shrink-0 text-violet-200/70">• {displayChyusenShop(entry)}</span></Button>)}</CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm sản phẩm, cửa hàng, series..." className="pl-9" /></div>
        <Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-full lg:w-[210px]"><SelectValue /></SelectTrigger><SelectContent>
          {CHYUSEN_STATUS_FILTER_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label} ({statusFilterCounts[option.value]})</SelectItem>)}
        </SelectContent></Select>
        <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as "deadline" | "resultDate")}><SelectTrigger className="w-full lg:w-[220px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="deadline">Sắp theo hạn đăng ký</SelectItem><SelectItem value="resultDate">Công bố gần nhất</SelectItem></SelectContent></Select>
      </div>

      {isLoading ? <div className="py-16 text-center text-sm text-muted-foreground">Đang tải Chyusen...</div> : filteredEntries.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-14 text-center"><Ticket className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" /><h2 className="font-semibold">Chưa có chương trình Chyusen</h2><p className="mt-1 text-sm text-muted-foreground">Dán link công khai của shop hoặc bài công bố chính thức để bắt đầu.</p><Button variant="outline" className="mt-4" onClick={openNew}>Thêm Chyusen</Button></CardContent></Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredEntries.map((entry: any) => {
            const deadlineToday = isChyusenDeadlineToday(entry.applicationEnd);
            const resultToday = isChyusenResultAnnouncementToday(entry);
            const waitingForResult = entry.applicationStatus === "registered" && entry.resultStatus !== "won" && entry.resultStatus !== "lost";
            const resultCountdown = waitingForResult ? formatChyusenResultCountdown(entry.resultDate) : null;
            const overdueResultCheck = isChyusenResultCheckOverdue(entry);
            const purchaseDeadlineRemaining = entry.applicationStatus === "won" && entry.pickupEnd ? formatChyusenDaysRemaining(entry.pickupEnd) : null;
            const purchaseDeadlineTone = purchaseDeadlineRemaining ? getChyusenDeadlineTone(entry.pickupEnd) : "normal";
            return (
            <Card key={entry.id} className={`overflow-hidden ${overdueResultCheck ? "border-red-400/90 shadow-[0_0_22px_rgba(248,113,113,0.25)]" : ""}`}><CardHeader className="space-y-3 pb-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="flex min-w-0 items-center gap-2"><button type="button" aria-label={`Xem đầy đủ tên sản phẩm: ${entry.title}`} onClick={() => setFullTitleEntry({ id: entry.id, title: entry.title })} className="min-w-0 flex-1 text-left outline-none transition-opacity active:opacity-70 focus-visible:ring-2 focus-visible:ring-primary"><CardTitle className="truncate text-base leading-snug sm:text-lg">{entry.title}</CardTitle></button>{resultToday && <Badge className="shrink-0 gap-1 border border-yellow-200 bg-yellow-400 px-2 py-0.5 text-xs font-bold text-slate-950 shadow-[0_0_18px_rgba(250,204,21,0.7)] motion-safe:animate-pulse"><Trophy className="h-3.5 w-3.5" />Hôm nay</Badge>}{deadlineToday && <Tooltip open={deadlineTooltipId === entry.id || showTodayTooltip} onOpenChange={(open) => setDeadlineTooltipId(open ? entry.id : null)}><TooltipTrigger asChild><button type="button" aria-label="Hạn đăng ký là hôm nay. Chạm để xem chi tiết." aria-expanded={deadlineTooltipId === entry.id || showTodayTooltip} onClick={() => setDeadlineTooltipId((current) => current === entry.id ? null : entry.id)} className="shrink-0 rounded-full text-red-400 outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-red-400"><CircleAlert className="h-5 w-5 animate-pulse" aria-hidden="true" /></button></TooltipTrigger><TooltipContent side="top">Hạn đăng ký là hôm nay. Hãy hoàn tất trước khi hết ngày.</TooltipContent></Tooltip>}</div><CardDescription title={`${displayChyusenShop(entry)} · ${entry.productType} · ${entry.series || "Pokemon"}`} className="mt-1 truncate">{displayChyusenShop(entry)} · {entry.productType} · {entry.series || "Pokemon"}</CardDescription></div><div className="flex shrink-0 flex-col items-end gap-1">{timeBadge(entry.timeState)}{participationBadge(entry.applicationStatus)}</div></div></CardHeader>
              <CardContent className="space-y-4"><div className="grid grid-cols-2 gap-3 text-sm"><div className="rounded-lg bg-secondary/55 p-3"><p className="text-xs text-muted-foreground">Hết hạn đăng ký</p><p className="mt-1 font-medium">{displayDate(entry.applicationEnd)}</p></div><div className="rounded-lg bg-secondary/55 p-3"><p className="text-xs text-muted-foreground">Công bố kết quả</p><p className="mt-1 font-medium">{displayDate(entry.resultDate)}</p></div></div>
                {isChyusenRegistrationExpired(entry.applicationEnd) && <div className="flex items-center justify-between gap-2 rounded-lg border border-red-300 bg-red-500/15 px-3 py-2 text-sm font-medium text-red-300"><span className="flex items-center gap-2"><Clock3 className="h-4 w-4" />Hạn đăng ký đã qua. Không thể đăng ký mới.</span><Badge className="shrink-0 border border-red-300 bg-red-500/20 text-red-200 hover:bg-red-500/20">{formatChyusenDaysRemaining(entry.applicationEnd)}</Badge></div>}
                {!isChyusenRegistrationExpired(entry.applicationEnd) && formatChyusenDaysRemaining(entry.applicationEnd) && <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${getChyusenDeadlineTone(entry.applicationEnd) === "urgent" ? "border-red-400/80 bg-red-500/20 text-red-100 shadow-[0_0_18px_rgba(248,113,113,0.26)]" : getChyusenDeadlineTone(entry.applicationEnd) === "warning" ? "border-amber-300/80 bg-amber-500/15 text-amber-100" : "border-sky-300/50 bg-sky-500/10 text-sky-200"}`}><CalendarClock className="h-4 w-4" />{formatChyusenDaysRemaining(entry.applicationEnd)}</div>}
                {resultCountdown && <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${resultToday ? "border-yellow-300/80 bg-yellow-400/15 text-yellow-100 shadow-[0_0_18px_rgba(250,204,21,0.25)]" : "border-violet-300/50 bg-violet-500/10 text-violet-100"}`}><Trophy className="h-4 w-4 shrink-0" />{resultCountdown}</div>}
                {overdueResultCheck && <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-300/90 bg-red-500/20 px-3 py-2 text-sm text-red-100 shadow-[0_0_20px_rgba(248,113,113,0.28)]"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0 animate-pulse" /><div><p className="font-semibold">Chưa kiểm tra kết quả</p><p className="mt-0.5 text-xs text-red-100/85">Đã qua ngày công bố. Hãy kiểm tra kết quả từ cửa hàng và cập nhật trạng thái.</p></div></div>}
                {entry.urgency && entry.applicationStatus !== "registered" && <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"><Clock3 className="h-4 w-4" />{entry.urgency === "deadline_3h" ? "Sắp hết hạn trong 3 giờ" : entry.urgency === "deadline_24h" ? "Sắp hết hạn trong 24 giờ" : "Sắp hết hạn trong 72 giờ"}</div>}
                {entry.applicationStatus === "won" && entry.pickupEnd && purchaseDeadlineRemaining && <div className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm font-semibold ${purchaseDeadlineTone === "expired" ? "border-red-300/80 bg-red-500/15 text-red-100" : purchaseDeadlineTone === "urgent" ? "border-amber-300/80 bg-amber-500/15 text-amber-100" : purchaseDeadlineTone === "warning" ? "border-yellow-300/70 bg-yellow-500/10 text-yellow-100" : "border-emerald-300/70 bg-emerald-500/15 text-emerald-100"}`}><span className="flex items-center gap-2"><CalendarClock className="h-4 w-4 shrink-0" />Hạn mua hàng</span><div className="flex flex-wrap items-center justify-end gap-2"><Badge className="shrink-0 border border-current/55 bg-black/10 text-current hover:bg-black/15">{displayDate(entry.pickupEnd)}</Badge><Badge className="shrink-0 border border-current/55 bg-black/10 text-current hover:bg-black/15">{purchaseDeadlineRemaining}</Badge></div></div>}
                <div className="flex flex-wrap gap-2">
                  {entry.sourceUrl && <Button variant="outline" size="sm" asChild><a href={entry.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Mở website</a></Button>}
                  {entry.applicationStatus === "not_registered" && <Button variant="outline" size="sm" onClick={() => setParticipation.mutate({ id: entry.id, applicationStatus: "registered" })}><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Đã đăng ký</Button>}
                  {entry.applicationStatus === "registered" && <Button variant="outline" size="sm" title={entry.resultDate && !isChyusenResultReady(entry.resultDate) ? `Chờ ngày công bố: ${displayDate(entry.resultDate)}` : undefined} disabled={Boolean(entry.resultDate && !isChyusenResultReady(entry.resultDate))} className="border-yellow-400/70 text-yellow-300 hover:bg-yellow-500/15 hover:text-yellow-200 disabled:cursor-not-allowed disabled:opacity-45" onClick={() => setWinConfirmEntry(entry)}><Trophy className="mr-1.5 h-3.5 w-3.5" />{entry.resultDate && !isChyusenResultReady(entry.resultDate) ? "Chờ công bố" : "Đã trúng"}</Button>}
                  {entry.applicationStatus === "registered" && <Button variant="outline" size="sm" onClick={() => setParticipation.mutate({ id: entry.id, applicationStatus: "lost" })}><XCircle className="mr-1.5 h-3.5 w-3.5" />Đã trượt</Button>}
                  {entry.applicationStatus === "won" && !entry.purchaseCreatedAt && <><Button size="sm" className="bg-red-600 text-white hover:bg-red-700" onClick={() => purchaseDraft.mutate({ id: entry.id })}><Gift className="mr-1.5 h-3.5 w-3.5" />Thêm vào Mua Hàng</Button><Button variant="outline" size="sm" className="border-emerald-400/70 text-emerald-300 hover:bg-emerald-500/15 hover:text-emerald-200" disabled={markPurchaseCreated.isPending} onClick={() => markPurchaseCreated.mutate({ id: entry.id })}><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />{markPurchaseCreated.isPending ? "Đang hoàn tất..." : "Đã mua hàng"}</Button></>}
                  {entry.applicationStatus === "won" && !entry.purchaseCreatedAt && <Button variant="outline" size="sm" className="border-amber-400/70 text-amber-300 hover:bg-amber-500/15 hover:text-amber-200" onClick={() => setUndoWinEntry(entry)}><RotateCcw className="mr-1.5 h-3.5 w-3.5" />Hoàn tác Đã trúng</Button>}
                  <Button variant="ghost" size="sm" onClick={() => openEdit(entry)}><Pencil className="mr-1.5 h-3.5 w-3.5" />Sửa</Button><Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(entry.id)}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Xóa</Button>
                </div></CardContent>
            </Card>
            );
          })}
        </div>
      )}

      <Dialog open={fullTitleEntry !== null} onOpenChange={(open) => !open && setFullTitleEntry(null)}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Tên sản phẩm Chyusen</DialogTitle><DialogDescription>Toàn bộ tên sản phẩm được hiển thị bên dưới.</DialogDescription></DialogHeader>{fullTitleEntry && <p className="max-h-[50vh] overflow-y-auto break-words rounded-lg border bg-secondary/35 p-4 text-base leading-relaxed text-foreground">{fullTitleEntry.title}</p>}<div className="flex justify-end"><Button type="button" onClick={() => setFullTitleEntry(null)}>Đóng</Button></div></DialogContent>
      </Dialog>

      <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) { setEditingId(null); setDraft(EMPTY_CHYUSEN_DRAFT); setValidationErrors({}); setQrRegistrationUrl(null); setQrDetectedShop(null); setQrCropPreviews([]); setPendingQrAnalysis(null); setShowQrPreview(false); resetAiDraftState(); } }}>
        <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-4xl flex-col overflow-hidden p-0 sm:max-h-[calc(100dvh-3rem)] sm:w-[calc(100vw-3rem)] sm:max-w-4xl lg:max-w-5xl" onOpenAutoFocus={(event) => event.preventDefault()}>
          <DialogHeader className="shrink-0 border-b border-border/70 px-4 py-4 pr-12 sm:px-6"><DialogTitle>{editingId ? "Sửa 抽選" : "Thêm 抽選"}</DialogTitle><DialogDescription>URL là tùy chọn: dán link để tự động điền khi đọc được, hoặc nhập thủ công và lưu trực tiếp.</DialogDescription></DialogHeader>
          <div className="shrink-0 border-b border-emerald-400/20 bg-emerald-500/5 px-4 py-3 sm:px-6"><Label className="text-sm font-medium">Hạn mua hàng <span className="font-normal text-muted-foreground">(nếu trúng)</span></Label><Input className="mt-2 max-w-xs" type="text" inputMode="numeric" placeholder="Tháng/Ngày" maxLength={5} value={draft.pickupEnd} onChange={(event) => updateDraft("pickupEnd", formatChyusenDayMonthInput(event.target.value))} /></div>
          <div className="shrink-0 border-b border-border/50 bg-secondary/20 px-4 py-3 sm:px-6" data-chyusen-completion>
            <div className="mb-2 flex items-center justify-between gap-3 text-xs"><span className="font-medium text-foreground">Hoàn thiện thông tin</span><span className="text-muted-foreground">{completedChyusenSteps}/{chyusenCompletionSteps.length} mục</span></div>
            <Progress value={chyusenCompletionPercent} className="h-1.5 [&>[data-slot=progress-indicator]]:bg-emerald-500" />
            <p className="mt-2 text-xs text-muted-foreground">{chyusenCompletionPercent === 100 ? "Đã đủ các trường cần thiết để lưu." : `Còn ${chyusenCompletionSteps.filter((step) => !step.complete).map((step) => step.label).join(", ")}.`}</p>
          </div>
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5 pt-4 sm:px-6"><div className="space-y-5 py-2"><div className="rounded-lg border border-border bg-secondary/30 p-4"><Label>Link website 抽選 <span className="font-normal text-muted-foreground">(tùy chọn)</span></Label><div className="mt-2 flex flex-col gap-2 sm:flex-row"><Input value={draft.sourceUrl} onChange={(event) => { const value = event.target.value; updateDraft("sourceUrl", value); const detectedShop = detectChyusenShopFromUrl(value); if (detectedShop) { updateDraft("shop", detectedShop); updateDraft("customShopName", ""); } }} onPaste={(event) => { const value = event.clipboardData.getData("text"); const detectedShop = detectChyusenShopFromUrl(value); if (detectedShop) { window.setTimeout(() => { updateDraft("shop", detectedShop); updateDraft("customShopName", ""); }, 0); } }} placeholder="https://..." /><Button type="button" variant="outline" disabled={!draft.sourceUrl || previewUrl.isPending} onClick={() => previewUrl.mutate({ sourceUrl: draft.sourceUrl })}><Link2 className="mr-2 h-4 w-4" />{previewUrl.isPending ? "Đang đọc..." : "Đọc thông tin"}</Button></div><p className="mt-2 text-xs text-muted-foreground">Nếu link không đọc được, hệ thống sẽ để trống URL để bạn tiếp tục nhập tay và lưu bình thường.</p></div>
            {urlSuggestedShop && <div className="flex flex-col gap-2 rounded-lg border border-sky-400/45 bg-sky-500/10 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"><p className="text-sky-100">{draft.shop === urlSuggestedShop ? "Đã tự động điền cửa hàng" : "Đã nhận diện từ URL"}: <strong>{urlSuggestedShop}</strong></p>{draft.shop !== urlSuggestedShop && <Button type="button" size="sm" className="bg-sky-400 text-slate-950 hover:bg-sky-300" onClick={() => { updateDraft("shop", urlSuggestedShop); updateDraft("customShopName", ""); }}>Dùng cửa hàng này</Button>}</div>}
            {draft.parserNote && <div className={`rounded-lg border px-3 py-2 text-sm ${draft.parserStatus === "unavailable" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>{draft.parserNote}</div>}
            <details className="rounded-lg border border-dashed border-primary/35 bg-primary/5 p-4" data-chyusen-qr-tools><summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium text-foreground"><span className="flex items-center gap-2"><ImageUp className="h-4 w-4 text-primary" />Phân tích từ ảnh và QR</span><span className="text-xs font-normal text-muted-foreground">Chạm để mở</span></summary><div className="pt-3"><p className="text-xs text-muted-foreground">Chọn cách mở ảnh. Dù chọn quét QR, AI vẫn đọc đầy đủ mọi thông tin hiển thị trong toàn bộ ảnh.</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><Button type="button" variant={imageAnalysisMode === "image" ? "default" : "outline"} className={imageAnalysisMode === "image" ? "bg-red-600 hover:bg-red-700" : ""} disabled={analyzeImages.isPending} onClick={() => { setImageAnalysisMode("image"); imageUploadInputRef.current?.click(); }}><FileSearch className="mr-2 h-4 w-4" />Đọc thông tin từ ảnh</Button><Button type="button" variant={imageAnalysisMode === "qr" ? "default" : "outline"} className={imageAnalysisMode === "qr" ? "bg-sky-500 text-slate-950 hover:bg-sky-400" : ""} disabled={analyzeImages.isPending} onClick={() => { setImageAnalysisMode("qr"); imageUploadInputRef.current?.click(); }}><QrCode className="mr-2 h-4 w-4" />Quét QR + đọc ảnh</Button><Button type="button" variant="outline" className="border-sky-400/60 text-sky-200 hover:bg-sky-500/15 hover:text-sky-100" onClick={() => { setCameraQrError(null); setCameraQrStatus("idle"); setShowCameraQrDialog(true); }}><QrCode className="mr-2 h-4 w-4" />Quét QR từ camera</Button><Input ref={imageUploadInputRef} className="hidden" type="file" multiple accept="image/png,image/jpeg,image/webp" disabled={analyzeImages.isPending} onChange={handleImageUpload} /></div>{qrRegistrationUrl && <div className="mt-3 rounded-md border border-sky-400/40 bg-sky-500/10 p-2 text-xs"><p className="flex items-center gap-1 font-medium text-sky-100"><QrCode className="h-3.5 w-3.5" />Đã phát hiện mã QR</p><p className="mt-1 break-all text-sky-200">{qrRegistrationUrl}</p>{qrDetectedShop ? <p className="mt-1 text-emerald-200">Cửa hàng nhận diện: <strong>{qrDetectedShop}</strong></p> : <p className="mt-1 text-sky-100/75">Không xác định được cửa hàng từ miền QR.</p>}<div className="mt-2 flex flex-wrap gap-2"><Button type="button" size="sm" className="h-7 bg-sky-400 text-slate-950 hover:bg-sky-300" onClick={() => setShowQrPreview(true)}>Xem trước QR</Button><a className="inline-flex h-7 items-center rounded-md border border-sky-300/60 px-2 font-medium text-sky-100 hover:bg-sky-500/15" href={qrRegistrationUrl} target="_blank" rel="noreferrer">Mở kiểm tra</a></div></div>}{pendingQrAnalysis && <div className="mt-3 rounded-lg border border-amber-300/50 bg-amber-500/10 p-3"><p className="text-sm font-semibold text-amber-100">Xem trước vùng QR tự cắt</p><p className="mt-1 text-xs text-amber-50/80">AI sẽ nhận {pendingQrAnalysis.fullImageCount} ảnh đầy đủ và {qrCropPreviews.length} vùng QR cắt bổ sung sau khi bạn xác nhận.</p><div className="mt-3 flex flex-wrap gap-2">{qrCropPreviews.map((cropDataUrl, index) => <img key={`${index}-${cropDataUrl.slice(-24)}`} src={cropDataUrl} alt={`Vùng QR tự cắt ${index + 1}`} className="h-20 w-20 rounded-md border border-amber-200/60 bg-black object-contain" />)}</div><div className="mt-3 flex flex-wrap gap-2"><Button type="button" size="sm" className="bg-amber-400 text-slate-950 hover:bg-amber-300" onClick={() => { runImageAnalysis(pendingQrAnalysis.imageDataUrls); setPendingQrAnalysis(null); }}>Gửi đầy đủ ảnh cho AI</Button><Button type="button" size="sm" variant="outline" className="border-amber-200/60 text-amber-100 hover:bg-amber-500/15" onClick={() => setPendingQrAnalysis(null)}>Hủy</Button></div></div>}{analyzeImages.isPending && <p className="mt-2 text-xs font-medium text-primary">{aiRetryHint ? "AI đang thử lại để hoàn tất dữ liệu ảnh..." : imageAnalysisMode === "qr" ? "Đang quét QR và đọc đầy đủ nội dung ảnh..." : "AI đang đọc đầy đủ nội dung ảnh..."}</p>}</div></details>
            {aiProposal && <div className="space-y-3 rounded-lg border border-amber-400/60 bg-amber-500/10 p-3"><div><p className="flex items-center gap-2 text-sm font-semibold text-amber-100"><Sparkles className="h-4 w-4" />So sánh đề xuất AI từ {aiProposal.imageCount} ảnh</p><p className="mt-1 text-xs text-amber-50/80">Kiểm tra giá trị mới và đoạn bằng chứng trước khi áp dụng.</p></div><div className="space-y-2">{aiProposal.fields.map((field) => <div key={field} className="rounded-md border border-amber-300/25 bg-black/10 p-2 text-xs"><p className="font-medium text-amber-100">{field}</p><p className="mt-1 text-muted-foreground">Hiện tại: <span className="text-foreground">{String(draft[field] || "—")}</span></p><p className="text-emerald-200">AI đề xuất: {String(aiProposal.draft[field] || "—")}</p>{aiProposal.evidence[field] && <p className="mt-1 rounded bg-black/15 px-2 py-1 text-amber-50">Bằng chứng: “{aiProposal.evidence[field]}”</p>}</div>)}</div><div className="flex flex-wrap gap-2"><Button type="button" size="sm" className="bg-emerald-500 text-slate-950 hover:bg-emerald-400" onClick={applyAiProposal}>Áp dụng dữ liệu AI</Button><Button type="button" size="sm" variant="outline" className="border-amber-200/60 text-amber-50 hover:bg-amber-400/15" onClick={() => setAiProposal(null)}>Giữ dữ liệu hiện tại</Button></div></div>}
            {aiFilledFields.length > 0 && <div className="flex flex-col gap-2 rounded-lg border border-sky-400/50 bg-sky-500/10 p-3"><p className="flex items-center gap-2 text-sm font-medium text-sky-200"><Sparkles className="h-4 w-4" />AI đã điền {aiFilledFields.length} trường — các ô xanh cần kiểm tra.</p>{Object.keys(aiFieldEvidence).length > 0 && <div className="space-y-1 rounded-md bg-black/10 p-2 text-xs text-sky-50">{Object.entries(aiFieldEvidence).map(([field, evidence]) => <p key={field}><strong>{field}:</strong> “{evidence}”</p>)}</div>}<div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" className="border-sky-300/60 bg-transparent text-sky-100 hover:bg-sky-500/20" onClick={focusFirstAiField}>Chỉnh sửa nhanh</Button><Button type="button" size="sm" className="bg-sky-500 text-slate-950 hover:bg-sky-400" onClick={acceptAiDraft}>Chấp nhận tất cả</Button><Button type="button" size="sm" variant="outline" className="border-red-300/60 bg-transparent text-red-200 hover:bg-red-500/15" disabled={!aiDraftBackup} onClick={undoAiDraft}>Hoàn tác AI</Button></div></div>}
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Tên chương trình" fieldKey="title" error={validationErrors.title} aiConfidence={aiFieldConfidence.title}><Input aria-invalid={Boolean(validationErrors.title)} value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} /></Field><Field label="Tên sản phẩm" fieldKey="productName" error={validationErrors.productName} aiConfidence={aiFieldConfidence.productName}><Input aria-invalid={Boolean(validationErrors.productName)} value={draft.productName} onChange={(event) => updateDraft("productName", event.target.value)} /><ProductNameSuggestions search={draft.productName} onSelect={(product) => { updateDraft("productName", product.name); updateDraft("series", product.series || draft.series); updateDraft("productType", product.type === "junk_pack" ? "pack" : product.type); }} /></Field><Field label="Series" aiConfidence={aiFieldConfidence.series}><Select value={draft.series} onValueChange={(value) => updateDraft("series", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TRADING_CARD_SERIES.map((series) => <SelectItem key={series} value={series}>{tradingCardSeriesLabel(series)}</SelectItem>)}</SelectContent></Select></Field><Field label="Loại sản phẩm" aiConfidence={aiFieldConfidence.productType}><Select value={draft.productType} onValueChange={(value) => updateDraft("productType", value as ChyusenDraft["productType"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="card">Card</SelectItem><SelectItem value="box">Box</SelectItem><SelectItem value="pack">Pack</SelectItem><SelectItem value="set">Set</SelectItem><SelectItem value="other">Khác</SelectItem></SelectContent></Select></Field><Field label="Cửa hàng" fieldKey="shop" error={validationErrors.shop} aiConfidence={aiFieldConfidence.shop}><Select value={draft.shop} onValueChange={(value) => { updateDraft("shop", value); if (value !== ADD_CUSTOM_CHYUSEN_SHOP_VALUE) updateDraft("customShopName", ""); }}><SelectTrigger aria-invalid={Boolean(validationErrors.shop)}><SelectValue placeholder="Chọn cửa hàng" /></SelectTrigger><SelectContent>{shopOptions.map((shop: string) => <SelectItem key={shop} value={shop}>{shop}</SelectItem>)}<SelectItem value={ADD_CUSTOM_CHYUSEN_SHOP_VALUE}>Thêm cửa hàng mới</SelectItem></SelectContent></Select></Field>{draft.shop === ADD_CUSTOM_CHYUSEN_SHOP_VALUE && <div className="sm:col-span-2 rounded-lg border border-emerald-400/35 bg-emerald-500/5 p-3"><Field label="Thêm cửa hàng mới" fieldKey="customShopName" error={validationErrors.customShopName}><Input aria-invalid={Boolean(validationErrors.customShopName)} value={draft.customShopName} onChange={(event) => updateDraft("customShopName", event.target.value)} placeholder="Nhập tên cửa hàng chưa có trong gợi ý" /><p className="mt-1 text-xs text-muted-foreground">Tên sẽ tự lưu và xuất hiện trong danh sách cửa hàng sau khi lưu Chūsen.</p></Field></div>}<Field label="Product ID (nếu có)"><Input value={draft.externalProductId} onChange={(event) => updateDraft("externalProductId", event.target.value)} placeholder="VD: 1000255803" /></Field><Field label="Giá (¥)" aiConfidence={aiFieldConfidence.price}><Input type="number" min="0" value={draft.price} onChange={(event) => updateDraft("price", event.target.value)} /></Field><Field label="Giới hạn số lượng" aiConfidence={aiFieldConfidence.quantityLimit}><Input value={draft.quantityLimit} onChange={(event) => updateDraft("quantityLimit", event.target.value)} placeholder="VD: 1 Box / người" /></Field><div ref={dateFieldsRef} className="sm:col-span-2 h-0" aria-hidden="true" /><Field label="Bắt đầu đăng ký" aiConfidence={aiFieldConfidence.applicationStart}><Input type="text" inputMode="numeric" placeholder="Tháng/Ngày" maxLength={5} value={draft.applicationStart} onChange={(event) => updateDraft("applicationStart", formatChyusenDayMonthInput(event.target.value))} /></Field><Field label="Hết hạn đăng ký" fieldKey="applicationEnd" error={validationErrors.applicationEnd} aiConfidence={aiFieldConfidence.applicationEnd}><Input aria-invalid={Boolean(validationErrors.applicationEnd)} type="text" inputMode="numeric" placeholder="Tháng/Ngày" maxLength={5} value={draft.applicationEnd} onChange={(event) => updateDraft("applicationEnd", formatChyusenDayMonthInput(event.target.value))} /></Field><Field label="Công bố kết quả" fieldKey="resultDate" error={validationErrors.resultDate} aiConfidence={aiFieldConfidence.resultDate}><Input aria-invalid={Boolean(validationErrors.resultDate)} type="text" inputMode="numeric" placeholder="Tháng/Ngày" maxLength={5} value={draft.resultDate} onChange={(event) => updateDraft("resultDate", formatChyusenDayMonthInput(event.target.value))} /></Field><Field label="Ngày nhận hàng" aiConfidence={aiFieldConfidence.pickupStart}><Input type="text" inputMode="numeric" placeholder="Tháng/Ngày" maxLength={5} value={draft.pickupStart} onChange={(event) => updateDraft("pickupStart", formatChyusenDayMonthInput(event.target.value))} /></Field><Field label="Ghi chú thời điểm nhận hàng" aiConfidence={aiFieldConfidence.pickupNote}><Input value={draft.pickupNote} onChange={(event) => updateDraft("pickupNote", event.target.value)} placeholder="VD: Khoảng đầu tháng 9" /></Field><Field label="Điều kiện tham gia" aiConfidence={aiFieldConfidence.requirements}><Textarea value={draft.requirements} onChange={(event) => updateDraft("requirements", event.target.value)} placeholder="VD: Thành viên Joshin, yêu cầu đăng nhập..." /></Field><p className="sm:col-span-2 text-xs text-muted-foreground">Nhập ngày theo dạng <strong>Tháng/Ngày</strong>. Năm hiện tại theo giờ Nhật Bản sẽ được tự gán khi bạn bấm Lưu.</p></div>

            {Object.keys(draft.fieldConfidence).length > 0 && <div className="rounded-lg border border-border p-3"><p className="mb-2 text-sm font-medium">Độ tin cậy dữ liệu</p><div className="flex flex-wrap gap-2">{Object.entries(draft.fieldConfidence).map(([field, value]) => <Badge key={field} variant="outline" className={value === "detected" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : value === "needs_review" ? "border-amber-300 bg-amber-50 text-amber-900" : "border-slate-300 bg-slate-50 text-slate-700"}>{field}: {value === "detected" ? "đã nhận diện" : value === "needs_review" ? "cần kiểm tra" : "thiếu"}</Badge>)}</div></div>}
            <div className="sticky bottom-0 z-10 -mx-1 border-t border-border/70 bg-background/95 px-1 pb-1 pt-3 backdrop-blur"><div className="flex flex-col gap-2 sm:flex-row">{firstValidationError && <Button type="button" variant="outline" className="border-amber-400/60 text-amber-200 hover:bg-amber-500/15" onClick={() => focusChyusenErrorField(firstValidationError)}><CircleArrowUp className="mr-2 h-4 w-4" />Đến lỗi đầu tiên</Button>}<Button className="flex-1 bg-red-600 text-white hover:bg-red-700" onClick={submit} disabled={create.isPending || update.isPending}>{create.isPending || update.isPending ? "Đang lưu..." : editingId ? "Lưu thay đổi" : "Lưu 抽選"}</Button></div></div>
          </div></div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCameraQrDialog} onOpenChange={(open) => { setShowCameraQrDialog(open); if (!open) stopCameraQrScanner(); }}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Quét mã QR từ camera</DialogTitle><DialogDescription>Đưa mã QR vào giữa khung hình. Camera chỉ hoạt động trên thiết bị này và sẽ tắt ngay sau khi quét hoặc đóng hộp thoại.</DialogDescription></DialogHeader><div className="space-y-3"><div className="relative aspect-video overflow-hidden rounded-lg bg-black"><video ref={cameraVideoRef} className="h-full w-full object-cover" autoPlay muted playsInline /><div className="pointer-events-none absolute inset-[18%] rounded-lg border-2 border-sky-300/90 shadow-[0_0_24px_rgba(56,189,248,0.5)]" /></div>{cameraQrError ? <p className="rounded-md border border-red-400/50 bg-red-500/10 p-2 text-sm text-red-200">{cameraQrError}</p> : <p className="text-sm text-muted-foreground">{cameraQrStatus === "requesting" ? "Đang xin quyền mở camera..." : cameraQrStatus === "scanning" ? "Đang tìm mã QR..." : "Bấm Bật camera để bắt đầu quét."}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowCameraQrDialog(false)}>Đóng</Button><Button type="button" className="bg-sky-500 text-slate-950 hover:bg-sky-400" onClick={() => void startCameraQrScanner()}>{cameraQrStatus === "scanning" ? "Đang quét" : "Bật camera"}</Button></div></div></DialogContent>
      </Dialog>

      <Dialog open={showQrPreview} onOpenChange={setShowQrPreview}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Xem trước nội dung mã QR</DialogTitle><DialogDescription>Kiểm tra liên kết và cửa hàng nhận diện trước khi áp dụng vào biểu mẫu Chyusen.</DialogDescription></DialogHeader>{qrRegistrationUrl && <div className="space-y-4"><div className="rounded-lg border border-sky-400/40 bg-sky-500/10 p-3"><p className="flex items-center gap-2 text-sm font-semibold text-sky-100"><QrCode className="h-4 w-4" />Liên kết đăng ký từ QR</p><p className="mt-2 break-all rounded-md bg-black/15 px-2 py-1.5 text-xs text-sky-100">{qrRegistrationUrl}</p><p className="mt-3 text-sm text-foreground">Cửa hàng nhận diện: <strong className="text-emerald-300">{qrDetectedShop || "Chưa xác định"}</strong></p><p className="mt-1 text-xs text-muted-foreground">Chỉ các miền cửa hàng tin cậy mới tự điền tên cửa hàng. Hãy mở kiểm tra nếu liên kết lạ.</p></div><div className="flex flex-col gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" asChild><a href={qrRegistrationUrl} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Mở kiểm tra</a></Button><Button type="button" className="bg-sky-400 text-slate-950 hover:bg-sky-300" onClick={() => { updateDraft("sourceUrl", qrRegistrationUrl); if (qrDetectedShop) updateDraft("shop", qrDetectedShop); setShowQrPreview(false); toast.success("Đã áp dụng liên kết QR vào biểu mẫu."); }}>Áp dụng vào form</Button></div></div>}</DialogContent>
      </Dialog>

      <AlertDialog open={winConfirmEntry !== null} onOpenChange={(open) => !open && setWinConfirmEntry(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xác nhận đã trúng?</AlertDialogTitle><AlertDialogDescription>Bạn xác nhận đã trúng chương trình <strong className="text-foreground">{winConfirmEntry?.title}</strong>? Sau khi xác nhận, trạng thái sẽ chuyển sang Đã trúng và bạn có thể tạo giao dịch Mua Hàng từ chương trình này.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={setParticipation.isPending}>Hủy</AlertDialogCancel><AlertDialogAction className="bg-red-600 text-white hover:bg-red-700" disabled={setParticipation.isPending} onClick={() => winConfirmEntry && setParticipation.mutate({ id: winConfirmEntry.id, applicationStatus: "won" })}>{setParticipation.isPending ? "Đang cập nhật..." : "Xác nhận Đã trúng"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <AlertDialog open={undoWinEntry !== null} onOpenChange={(open) => !open && setUndoWinEntry(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hoàn tác trạng thái Đã trúng?</AlertDialogTitle><AlertDialogDescription>Chyusen <strong className="text-foreground">{undoWinEntry?.title}</strong> sẽ quay lại trạng thái Đã đăng ký. Thao tác này không khả dụng sau khi đã tạo Mua Hàng.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={undoWon.isPending}>Hủy</AlertDialogCancel><AlertDialogAction className="bg-amber-500 text-slate-950 hover:bg-amber-400" disabled={undoWon.isPending} onClick={() => undoWinEntry && undoWon.mutate({ id: undoWinEntry.id })}>{undoWon.isPending ? "Đang hoàn tác..." : "Hoàn tác Đã trúng"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xóa chương trình Chyusen?</AlertDialogTitle><AlertDialogDescription>Hành động này xóa Chyusen và các thông báo/lịch sử liên quan trong tài khoản của bạn.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Hủy</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteId && remove.mutate({ id: deleteId })}>Xóa</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <Dialog open={showSourceDialog} onOpenChange={(open) => { setShowSourceDialog(open); if (!open) setEditingSourceId(null); }}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{editingSourceId ? "Sửa nguồn theo dõi" : "Thêm nguồn theo dõi"}</DialogTitle><DialogDescription>Chỉ thêm URL công khai. Bạn có thể sửa tên nguồn, URL, trạng thái và tần suất khi nhập sai.</DialogDescription></DialogHeader><div className="space-y-4 py-2"><Field label="Tên cửa hàng / nguồn"><Input value={sourceDraft.label} onChange={(event) => setSourceDraft((current) => ({ ...current, label: event.target.value }))} placeholder="VD: Joshin" /></Field><Field label="URL công khai"><Input value={sourceDraft.sourceUrl} onChange={(event) => setSourceDraft((current) => ({ ...current, sourceUrl: event.target.value }))} placeholder="https://..." /></Field><Field label="Tần suất kiểm tra"><Select value={String(sourceDraft.checkIntervalMinutes)} onValueChange={(value) => setSourceDraft((current) => ({ ...current, checkIntervalMinutes: Number(value) as 60 | 180 | 360 | 720 | 1440 }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="60">1 giờ</SelectItem><SelectItem value="180">3 giờ</SelectItem><SelectItem value="360">6 giờ</SelectItem><SelectItem value="720">12 giờ</SelectItem><SelectItem value="1440">24 giờ</SelectItem></SelectContent></Select></Field>{editingSourceId && <div className="flex items-center justify-between rounded-lg border p-3"><div><p className="text-sm font-medium">Bật theo dõi</p><p className="text-xs text-muted-foreground">Nguồn tắt sẽ không được kiểm tra tự động.</p></div><Switch checked={sourceDraft.isActive} onCheckedChange={(checked) => setSourceDraft((current) => ({ ...current, isActive: checked }))} /></div>}<Button className="w-full bg-red-600 text-white hover:bg-red-700" disabled={!sourceDraft.sourceUrl || createSource.isPending || updateSource.isPending} onClick={saveSource}>{createSource.isPending || updateSource.isPending ? "Đang lưu..." : editingSourceId ? "Lưu thay đổi" : "Lưu nguồn"}</Button></div></DialogContent></Dialog>
      <AlertDialog open={deleteSourceId !== null} onOpenChange={(open) => !open && setDeleteSourceId(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xóa nguồn theo dõi?</AlertDialogTitle><AlertDialogDescription>Nguồn sẽ không còn được kiểm tra tự động. Các Chyusen và audit log đã lưu của bạn vẫn được giữ nguyên.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Hủy</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteSource.isPending} onClick={() => deleteSourceId && deleteSource.mutate({ id: deleteSourceId })}>{deleteSource.isPending ? "Đang xóa..." : "Xóa nguồn"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}

function Field({ label, children, error, aiConfidence, fieldKey }: { label: string; children: React.ReactNode; error?: string; aiConfidence?: "high" | "medium" | "low"; fieldKey?: string }) {
  if (label === "Tên chương trình") return null;
  const confidenceLabel = aiConfidence === "high" ? "AI · Cao" : aiConfidence === "medium" ? "AI · Trung bình" : aiConfidence === "low" ? "AI · Thấp" : null;
  const confidenceClass = aiConfidence === "high" ? "border-emerald-400/55 bg-emerald-500/10" : aiConfidence === "medium" ? "border-sky-400/55 bg-sky-500/10" : aiConfidence === "low" ? "border-amber-400/55 bg-amber-500/10" : "";
  return <div data-chyusen-field={fieldKey} data-ai-filled={aiConfidence ? "true" : undefined} className={`space-y-2 rounded-lg transition-colors ${aiConfidence ? `border p-3 shadow-[0_0_0_1px_rgba(56,189,248,0.12)] ${confidenceClass}` : ""}`}><Label className={error ? "text-destructive" : ""}>{label}{error ? " *" : ""}{confidenceLabel && <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-current/40 bg-black/10 px-1.5 py-0.5 text-[10px] font-semibold"><Sparkles className="h-2.5 w-2.5" />{confidenceLabel}</span>}</Label>{children}{error && <p className="text-xs text-destructive">{error}</p>}</div>;
}
