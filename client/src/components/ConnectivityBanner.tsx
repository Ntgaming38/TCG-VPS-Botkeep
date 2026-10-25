import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/lib/useOfflineData";

/** Slim top bar shown only while the device has no network connection. */
export default function ConnectivityBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 bg-amber-500 px-3 py-1.5 text-center text-xs font-semibold text-amber-950">
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      <span>Đang offline — vẫn xem được kho đã lưu và ghi bán nháp, dữ liệu sẽ đồng bộ khi có mạng lại.</span>
    </div>
  );
}
