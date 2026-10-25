import { useCallback, useEffect, useRef, useState } from "react";
import { CloudUpload, FileClock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatYen } from "@shared/formatYen";
import { useOnlineStatus } from "@/lib/useOfflineData";
import {
  listOfflineSaleDrafts,
  offlineSaleDraftGross,
  removeOfflineSaleDraft,
  type OfflineSaleDraft,
} from "@/lib/offlineSaleDrafts";

/**
 * Panel on the Bán Hàng page listing sales recorded while offline. Drafts
 * live only on this device; each can be synced verbatim through sales.create
 * once the network is back, or deleted. Nothing is auto-submitted — stock may
 * have changed, so the user stays in control of when drafts hit the books.
 */
export default function OfflineSaleDrafts({ refreshKey = 0 }: { refreshKey?: number }) {
  const utils = trpc.useUtils();
  const online = useOnlineStatus();
  const [drafts, setDrafts] = useState<OfflineSaleDraft[]>(() => listOfflineSaleDrafts());
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const remindedRef = useRef(false);

  const createSale = trpc.sales.create.useMutation();

  const reload = useCallback(() => setDrafts(listOfflineSaleDrafts()), []);
  useEffect(() => {
    reload();
  }, [reload, refreshKey]);
  useEffect(() => {
    window.addEventListener("online", reload);
    return () => window.removeEventListener("online", reload);
  }, [reload]);

  useEffect(() => {
    if (online && drafts.length > 0 && !remindedRef.current) {
      remindedRef.current = true;
      toast.info(`Bạn có ${drafts.length} giao dịch bán nháp offline chưa đồng bộ.`);
    }
    if (drafts.length === 0) remindedRef.current = false;
  }, [online, drafts.length]);

  const invalidateAfterSync = () => {
    utils.sales.list.invalidate();
    utils.products.list.invalidate();
    utils.products.inStock.invalidate();
    utils.dashboard.stats.invalidate();
    utils.reports.overview.invalidate();
    utils.purchases.list.invalidate();
  };

  const syncDraft = async (draft: OfflineSaleDraft): Promise<boolean> => {
    try {
      await createSale.mutateAsync(draft.payload);
      removeOfflineSaleDraft(draft.id);
      reload();
      invalidateAfterSync();
      return true;
    } catch {
      return false;
    }
  };

  const handleSyncOne = async (draft: OfflineSaleDraft) => {
    setSyncingId(draft.id);
    const ok = await syncDraft(draft);
    setSyncingId(null);
    if (ok) toast.success(`Đã đồng bộ giao dịch bán: ${draft.productName}.`);
    else toast.error(`Chưa đồng bộ được "${draft.productName}" — có thể sản phẩm đã hết hàng hoặc mạng chưa ổn định. Bản nháp vẫn được giữ lại.`);
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    let synced = 0;
    for (const draft of [...drafts]) {
      if (await syncDraft(draft)) synced += 1;
    }
    setSyncingAll(false);
    if (synced > 0) toast.success(`Đã đồng bộ ${synced} giao dịch bán nháp.`);
    if (synced < drafts.length) toast.error(`Còn ${drafts.length - synced} bản nháp chưa đồng bộ được — kiểm tra tồn kho rồi thử lại.`);
  };

  const handleDelete = (draft: OfflineSaleDraft) => {
    removeOfflineSaleDraft(draft.id);
    reload();
    toast.success(`Đã xoá bản nháp: ${draft.productName}.`);
  };

  if (drafts.length === 0) return null;

  return (
    <Card className="border-amber-500/40 bg-amber-500/5">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <FileClock className="h-4 w-4 text-amber-400" />
            Bản nháp bán offline ({drafts.length})
          </p>
          <Button
            type="button"
            size="sm"
            className="gap-1.5 bg-amber-600 hover:bg-amber-700"
            disabled={!online || syncingAll || syncingId !== null}
            onClick={() => void handleSyncAll()}
          >
            <CloudUpload className="h-3.5 w-3.5" />
            {syncingAll ? "Đang đồng bộ..." : online ? "Đồng bộ tất cả" : "Chưa có mạng"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Các giao dịch này được ghi khi mất mạng và chỉ lưu trên thiết bị này. Đồng bộ để ghi chính thức vào sổ bán hàng — nếu sản phẩm đã hết hàng, bản nháp sẽ được giữ lại để bạn xử lý.
        </p>
        <div className="space-y-2">
          {drafts.map((draft) => (
            <div key={draft.id} className="flex flex-col gap-2 rounded-lg border bg-background/40 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{draft.productName}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  SL {draft.payload.quantity} · {formatYen(offlineSaleDraftGross(draft))} · ghi lúc {new Date(draft.createdAt).toLocaleString("vi-VN")}
                  {draft.payload.note ? ` · ${draft.payload.note}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={!online || syncingId !== null || syncingAll}
                  onClick={() => void handleSyncOne(draft)}
                >
                  <CloudUpload className="h-3.5 w-3.5" />
                  {syncingId === draft.id ? "Đang đồng bộ" : "Đồng bộ"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  disabled={syncingId !== null || syncingAll}
                  onClick={() => handleDelete(draft)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Xoá
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
