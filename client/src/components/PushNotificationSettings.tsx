import { useEffect, useState } from "react";
import { BellOff, BellRing, Send } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  getExistingPushSubscription,
  getPushSupportState,
  pushSupportMessage,
  subscribeToPush,
  unsubscribeFromPush,
  type PushSupportState,
} from "@/lib/pushNotifications";

/**
 * "Thông báo đẩy" settings body: per-device Web Push opt-in. Each browser or
 * installed PWA subscribes separately; the server pushes Chyusen notices and
 * Shop SNKR price movements from automatic price syncs to subscribed devices.
 */
export default function PushNotificationSettings() {
  const utils = trpc.useUtils();
  const [support] = useState<PushSupportState>(() => getPushSupportState());
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default",
  );
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const subscribeMutation = trpc.push.subscribe.useMutation();
  const unsubscribeMutation = trpc.push.unsubscribe.useMutation();
  const sendTest = trpc.push.sendTest.useMutation({
    onSuccess: (summary) => toast.success(`Đã gửi thông báo thử tới ${summary.sent}/${summary.attempted} thiết bị đã đăng ký.`),
    onError: (error) => toast.error(error.message || "Không gửi được thông báo thử."),
  });

  useEffect(() => {
    if (support !== "supported") {
      setSubscribed(false);
      return;
    }
    let cancelled = false;
    void getExistingPushSubscription()
      .then((existing) => {
        if (!cancelled) setSubscribed(Boolean(existing));
      })
      .catch(() => {
        if (!cancelled) setSubscribed(false);
      });
    return () => {
      cancelled = true;
    };
  }, [support]);

  const enablePush = async () => {
    setBusy(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") {
        toast.error("Bạn chưa cho phép thông báo. Hãy cho phép trong hộp thoại của trình duyệt rồi thử lại.");
        return;
      }
      const { publicKey } = await utils.push.getPublicKey.fetch();
      const payload = await subscribeToPush(publicKey);
      await subscribeMutation.mutateAsync({ endpoint: payload.endpoint, keys: payload.keys, userAgent: navigator.userAgent });
      setSubscribed(true);
      toast.success("Đã bật thông báo đẩy trên thiết bị này.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không bật được thông báo đẩy.");
    } finally {
      setBusy(false);
    }
  };

  const disablePush = async () => {
    setBusy(true);
    try {
      const endpoint = await unsubscribeFromPush();
      if (endpoint) await unsubscribeMutation.mutateAsync({ endpoint });
      setSubscribed(false);
      toast.success("Đã tắt thông báo đẩy trên thiết bị này.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không tắt được thông báo đẩy.");
    } finally {
      setBusy(false);
    }
  };

  if (support !== "supported") {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
        <p className="text-sm font-semibold">Thiết bị này chưa bật được thông báo đẩy</p>
        <p className="mt-1 text-xs text-muted-foreground">{pushSupportMessage(support)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Thông báo đẩy trên thiết bị này</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {subscribed === null
              ? "Đang kiểm tra trạng thái đăng ký..."
              : subscribed
                ? "Đang bật — bạn sẽ nhận thông báo Chyusen mới và biến động giá Shop SNKR từ các lượt đồng bộ giá tự động, kể cả khi app đang đóng."
                : "Đang tắt — bật để nhận thông báo Chyusen mới và biến động giá Shop SNKR ngay trên màn hình khoá, kể cả khi app đang đóng."}
          </p>
          {permission === "denied" && (
            <p className="mt-1 text-xs text-red-500">Trình duyệt đang chặn thông báo. Hãy mở Cài đặt của thiết bị, cho phép thông báo cho TCG Manager rồi quay lại bật lại.</p>
          )}
        </div>
        {subscribed ? (
          <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5" disabled={busy} onClick={() => void disablePush()}>
            <BellOff className="h-3.5 w-3.5" />
            Tắt thông báo
          </Button>
        ) : (
          <Button type="button" size="sm" className="shrink-0 gap-1.5 bg-red-600 hover:bg-red-700" disabled={busy || subscribed === null} onClick={() => void enablePush()}>
            <BellRing className="h-3.5 w-3.5" />
            {busy ? "Đang bật" : "Bật thông báo"}
          </Button>
        )}
      </div>
      {subscribed && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed p-3">
          <p className="text-xs text-muted-foreground">Muốn chắc chắn thông báo đến nơi? Gửi một thông báo thử tới mọi thiết bị đã đăng ký của tài khoản này.</p>
          <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5" disabled={sendTest.isPending} onClick={() => sendTest.mutate()}>
            <Send className="h-3.5 w-3.5" />
            {sendTest.isPending ? "Đang gửi" : "Gửi thử"}
          </Button>
        </div>
      )}
    </div>
  );
}
