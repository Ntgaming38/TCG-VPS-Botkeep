import { Bell, CheckCheck, ChevronRight, Ticket, X } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { getUnreadChyusenCount } from "@shared/chyusenNotifications";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

function relativeTime(date: Date | string) {
  const difference = Date.now() - new Date(date).getTime();
  const minutes = Math.max(0, Math.floor(difference / 60_000));
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

function notificationIcon(type: string) {
  if (type.includes("deadline")) return "🚨";
  if (type.includes("result")) return "📢";
  if (type.includes("source")) return "⚠️";
  if (type.includes("won")) return "🎉";
  if (type.includes("lost")) return "❌";
  return "🎟️";
}

export function NotificationCenter() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data: notifications = [] } = trpc.chyusen.notifications.useQuery(undefined, { staleTime: 30_000 });
  const unreadCount = getUnreadChyusenCount(notifications);
  const refresh = () => utils.chyusen.notifications.invalidate();
  const markRead = trpc.chyusen.markNotificationRead.useMutation({ onSuccess: refresh });
  const markAllRead = trpc.chyusen.markAllNotificationsRead.useMutation({ onSuccess: refresh });
  const remove = trpc.chyusen.deleteNotification.useMutation({ onSuccess: refresh });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full text-foreground hover:bg-primary/10" aria-label="Mở thông báo">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1 py-0.5 text-[10px] font-bold text-white">{unreadCount > 99 ? "99+" : unreadCount}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(92vw,390px)] rounded-xl p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <DropdownMenuLabel className="p-0 text-base font-bold">🔔 Thông báo</DropdownMenuLabel>
          {unreadCount > 0 && <Button variant="ghost" size="sm" onClick={() => markAllRead.mutate()} className="h-8 px-2 text-xs text-primary"><CheckCheck className="mr-1 h-3.5 w-3.5" />Đọc tất cả</Button>}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="max-h-[360px] overflow-y-auto p-1.5">
          {notifications.slice(0, 5).map((notification: any) => (
            <div key={notification.id} className={`group flex gap-3 rounded-lg px-3 py-3 ${notification.isRead ? "opacity-70" : "bg-primary/5"}`}>
              <button className="flex min-w-0 flex-1 gap-3 text-left" onClick={() => { if (!notification.isRead) markRead.mutate({ id: notification.id }); setLocation(notification.entryId ? "/chyusen" : "/thong-bao"); }}>
                <span className="mt-0.5 text-lg">{notificationIcon(notification.type)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">{notification.title}</span>
                  <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{notification.message}</span>
                  <span className="mt-1 block text-[11px] text-muted-foreground">{relativeTime(notification.createdAt)}</span>
                </span>
              </button>
              <button className="mt-0.5 h-6 w-6 shrink-0 rounded opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100" onClick={() => remove.mutate({ id: notification.id })} aria-label="Xóa thông báo"><X className="mx-auto h-3.5 w-3.5" /></button>
            </div>
          ))}
          {notifications.length === 0 && <div className="px-4 py-8 text-center text-sm text-muted-foreground"><Ticket className="mx-auto mb-2 h-5 w-5 opacity-60" />Chưa có thông báo mới.</div>}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <DropdownMenuItem className="m-1.5 cursor-pointer justify-center rounded-lg text-primary" onClick={() => setLocation("/thong-bao")}>Xem tất cả <ChevronRight className="ml-1 h-4 w-4" /></DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
