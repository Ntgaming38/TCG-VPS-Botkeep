import { useMemo, useState } from "react";
import { Bell, CheckCheck, Filter, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";

const filters = [
  { value: "all", label: "Tất cả" }, { value: "unread", label: "Chưa đọc" }, { value: "chyusen", label: "抽選" },
  { value: "purchase", label: "Mua hàng" }, { value: "sale", label: "Bán hàng" }, { value: "marketplace", label: "Marketplace" },
  { value: "inventory", label: "Kho hàng" }, { value: "system", label: "Hệ thống" },
];

const notificationEmoji = (type: string) => type.includes("deadline") ? "🚨" : type.includes("result") ? "📢" : type.includes("source") ? "⚠️" : type.includes("won") ? "🎉" : type.includes("lost") ? "❌" : "🎟️";

export default function Notifications() {
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const utils = trpc.useUtils();
  const { data: notifications = [], isLoading } = trpc.chyusen.notifications.useQuery();
  const refresh = () => utils.chyusen.notifications.invalidate();
  const markRead = trpc.chyusen.markNotificationRead.useMutation({ onSuccess: refresh });
  const markAllRead = trpc.chyusen.markAllNotificationsRead.useMutation({ onSuccess: refresh });
  const remove = trpc.chyusen.deleteNotification.useMutation({ onSuccess: refresh });
  const visible = useMemo(() => notifications.filter((notification: any) => filter === "all" || filter === "unread" ? filter !== "unread" || !notification.isRead : notification.category === filter).sort((a: any, b: any) => sort === "newest" ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()), [filter, notifications, sort]);

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold">🔔 Thông báo</h1><p className="mt-1 text-sm text-muted-foreground">Theo dõi các sự kiện quan trọng của TCG Manager.</p></div><Button variant="outline" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}><CheckCheck className="mr-2 h-4 w-4" />Đánh dấu tất cả đã đọc</Button></div>
    <Card><CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between"><CardTitle className="text-base">Notification Center</CardTitle><div className="flex gap-2"><Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-[150px]"><Filter className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger><SelectContent>{filters.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select><Select value={sort} onValueChange={(value) => setSort(value as "newest" | "oldest")}><SelectTrigger className="w-[135px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="newest">Mới nhất</SelectItem><SelectItem value="oldest">Cũ nhất</SelectItem></SelectContent></Select></div></CardHeader><CardContent className="space-y-2">{isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Đang tải thông báo…</p> : visible.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground"><Bell className="mx-auto mb-2 h-6 w-6" />Không có thông báo phù hợp.</p> : visible.map((notification: any) => <div key={notification.id} className={`flex gap-3 rounded-xl border p-4 transition-colors ${notification.isRead ? "border-border bg-card" : "border-primary/30 bg-primary/5"}`}><button className="flex min-w-0 flex-1 gap-3 text-left" onClick={() => { if (!notification.isRead) markRead.mutate({ id: notification.id }); if (notification.entryId) setLocation("/chyusen"); }}><span className="text-xl">{notificationEmoji(notification.type)}</span><span className="min-w-0"><span className="block font-semibold">{notification.title}</span><span className="mt-1 block text-sm text-muted-foreground">{notification.message}</span><span className="mt-2 block text-xs text-muted-foreground">{new Date(notification.createdAt).toLocaleString("vi-VN")}</span></span></button><Button variant="ghost" size="icon" className="shrink-0" onClick={() => remove.mutate({ id: notification.id })} aria-label="Xóa thông báo"><Trash2 className="h-4 w-4 text-muted-foreground" /></Button></div>)}</CardContent></Card>
  </div>;
}
