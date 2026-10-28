import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  BarChart3, LogOut, PanelLeft, CreditCard, Box, Gift, Package, RefreshCw, UserRoundCog, Store,
  ChevronDown, ChevronLeft, ChevronRight,
  Warehouse, ShoppingCart, DollarSign, TrendingUp, FileText, LayoutDashboard, Ticket, Settings, History, Trash2, ListChecks
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { trpc } from "@/lib/trpc";
import { getUnreadChyusenCount } from "@shared/chyusenNotifications";
import { shouldPlayChyusenAlert } from "@shared/chyusenNotificationFilter";
import { shouldOpenMobileSidebarFromSwipe } from "@shared/mobileSidebarGesture";
import { playChyusenNotificationSound } from "@/lib/chyusenNotificationSound";
import { shouldTriggerPullToRefresh } from "@shared/pullToRefresh";
import { NotificationCenter } from "./NotificationCenter";
import { AccountSettingsDialog } from "./AccountSettingsDialog";
import { SupportDialog } from "./SupportDialog";
import { Headphones } from "lucide-react";

const menuItems = [
  { icon: LayoutDashboard, label: "TCG Manager", path: "/thong-ke" },
  { icon: CreditCard, label: "Card", path: "/san-pham/card" },
  { icon: Box, label: "Box", path: "/san-pham/box" },
  { icon: Gift, label: "Pack", path: "/san-pham/pack" },
  { icon: Package, label: "Pack Rác", path: "/san-pham/junk_pack" },
  { icon: Warehouse, label: "Kho Hàng", path: "/kho-hang" },
  { icon: ShoppingCart, label: "Mua Hàng", path: "/mua-hang" },
  { icon: DollarSign, label: "Bán Hàng", path: "/ban-hang" },
  { icon: TrendingUp, label: "Marketplace", path: "/marketplace" },
  { icon: Store, label: "Shop SNKR", path: "/shop-snkr" },
  { icon: Ticket, label: "抽選 / Chūsen", path: "/chyusen" },
  { icon: ListChecks, label: "Lịch sử Chūsen", path: "/lich-su-chyusen" },
  { icon: History, label: "Lịch Sử", path: "/lich-su" },
  { icon: FileText, label: "Báo Cáo", path: "/bao-cao" },
  { icon: Settings, label: "Cài đặt", path: "/cai-dat" },
  { icon: Trash2, label: "Thùng rác", path: "/thung-rac" },
];

/**
 * Xác định menu đang active cho một route.
 *
 * Khớp chính xác route, HOẶC route con (path + "/"). Việc bắt buộc có dấu "/"
 * phân cách giúp không nhầm hai menu có tiền tố giống nhau, ví dụ:
 * - "/lich-su-chyusen" KHÔNG làm menu "/lich-su" active (vì "/lich-su-"
 *   không bắt đầu bằng "/lich-su/").
 * - "/shop-snkr/123" vẫn làm menu "/shop-snkr" active (trang con hợp lệ).
 */
function isMenuItemActive(location: string, path: string) {
  return location === path || location.startsWith(`${path}/`);
}

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950">
        <div className="absolute inset-0">
          <img
            src="/login-bg.jpg"
            alt="Pikachu và Lucario trên nền đăng nhập TCG Manager"
            className="login-background-image h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-slate-950/60" />
        </div>
        <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-8 p-8">
          <div className="flex flex-col items-center gap-4">
            <h1 className="pokemon-logo-text text-4xl">POKÉMON</h1>
            <p className="text-sm text-muted-foreground text-center">
              Nhấn để tiếp tục sử dụng TCG Manager
            </p>
          </div>
          <Button
            onClick={() => startLogin()}
            size="lg"
            className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-bold"
          >
            Bắt Đầu
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
}) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar, openMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const pullStartRef = useRef<{ x: number; y: number } | null>(null);
  const knownUnreadChyusenIdsRef = useRef<Set<number> | null>(null);
  const activeMenuItem = menuItems.find(item => isMenuItemActive(location, item.path));
  const isMobile = useIsMobile();
  const { data: chyusenNotifications = [] } = trpc.chyusen.notifications.useQuery(undefined, { staleTime: 60_000, refetchInterval: 60_000 });
  const { data: chyusenNotificationSettings } = trpc.chyusen.notificationSettings.useQuery(undefined, { staleTime: 60_000 });
  const unreadChyusenCount = getUnreadChyusenCount(chyusenNotifications);

  useEffect(() => {
    const unreadNotifications = chyusenNotifications.filter((notification: any) => !notification.isRead);
    const currentIds = new Set(unreadNotifications.map((notification: any) => notification.id));
    if (knownUnreadChyusenIdsRef.current === null) {
      knownUnreadChyusenIdsRef.current = currentIds;
      return;
    }
    const freshNotifications = unreadNotifications.filter((notification: any) => !knownUnreadChyusenIdsRef.current?.has(notification.id));
    knownUnreadChyusenIdsRef.current = currentIds;
    const hasUrgent = freshNotifications.some((notification: any) => notification.priority === "high" || notification.priority === "critical");
    const hasRegular = freshNotifications.some((notification: any) => notification.priority !== "high" && notification.priority !== "critical");
    if (hasUrgent && shouldPlayChyusenAlert({ priority: "critical", soundUrgentEnabled: chyusenNotificationSettings?.soundUrgentEnabled })) playChyusenNotificationSound(true);
    else if (hasRegular && shouldPlayChyusenAlert({ priority: "medium", soundNewEnabled: chyusenNotificationSettings?.soundNewEnabled })) playChyusenNotificationSound(false);
  }, [chyusenNotificationSettings?.soundNewEnabled, chyusenNotificationSettings?.soundUrgentEnabled, chyusenNotifications]);

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    if (!isMobile || openMobile) return;
    let touchStart: { x: number; y: number } | null = null;

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      touchStart = touch ? { x: touch.clientX, y: touch.clientY } : null;
    };
    const onTouchEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (!touchStart || !touch) return;
      if (shouldOpenMobileSidebarFromSwipe({ startX: touchStart.x, startY: touchStart.y, endX: touch.clientX, endY: touch.clientY })) {
        setOpenMobile(true);
      }
      touchStart = null;
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isMobile, openMobile, setOpenMobile]);

  useEffect(() => {
    if (!isMobile || isRefreshing || openMobile) return;
    const getScrollTop = () => document.scrollingElement?.scrollTop ?? window.scrollY;
    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      const isChyusenFormOpen = document.body.dataset.chyusenFormOpen === "true";
      pullStartRef.current = touch && getScrollTop() <= 0 && !isChyusenFormOpen ? { x: touch.clientX, y: touch.clientY } : null;
    };
    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      const start = pullStartRef.current;
      if (!touch || !start || getScrollTop() > 0) return;
      const deltaY = touch.clientY - start.y;
      const deltaX = Math.abs(touch.clientX - start.x);
      if (deltaY <= 0 || deltaY <= deltaX) return;
      setPullDistance(Math.min(96, deltaY));
      if (event.cancelable) event.preventDefault();
    };
    const onTouchEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      const start = pullStartRef.current;
      pullStartRef.current = null;
      if (!touch || !start) { setPullDistance(0); return; }
      const shouldRefresh = shouldTriggerPullToRefresh({ startX: start.x, startY: start.y, endX: touch.clientX, endY: touch.clientY, scrollTop: getScrollTop(), disabled: document.body.dataset.chyusenFormOpen === "true" });
      setPullDistance(0);
      if (!shouldRefresh) return;
      setIsRefreshing(true);
      window.setTimeout(() => window.location.reload(), 120);
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isMobile, isRefreshing, openMobile]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div aria-hidden className="ambient-glow" />
      <div className="relative" ref={sidebarRef}>
          <Sidebar collapsible="icon" variant="floating" className="border-r-0" disableTransition={isResizing}>
          <SidebarHeader className="h-16 justify-center border-b border-white/10">
            <div className={`flex items-center gap-3 px-2 transition-all w-full ${isCollapsed ? "justify-center px-0" : ""}`}>
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-sidebar-accent rounded-lg transition-colors focus:outline-none shrink-0 group-data-[collapsible=icon]:hidden"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-primary" />
              </button>
              {!isCollapsed ? (
                <span className="tcg-logo-text text-lg tracking-wider font-black">TCG Manager</span>
              ) : (
                <span className="tcg-logo-text text-base tracking-wider font-black">TCG</span>
              )}
            </div>
          </SidebarHeader>

          {/* Tài khoản — ngay dưới logo (bố cục A3): bấm mở Cài đặt tài khoản / Liên hệ hỗ trợ */}
          <div className="border-b border-white/10 px-3 py-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition-colors hover:bg-white/10 focus:outline-none group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-1 group-data-[collapsible=icon]:shadow-none">
                  <Avatar className="h-10 w-10 shrink-0 border-2 bg-white" style={{ borderColor: user?.avatarBorderColor || undefined }}>
                    <AvatarImage src={user?.avatarUrl || undefined} alt={user?.nickname || user?.name || "Người dùng"} className="object-cover" />
                    <AvatarFallback className="text-xs font-medium bg-primary/20 text-primary">
                      {(user?.nickname || user?.name)?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 overflow-hidden group-data-[collapsible=icon]:hidden">
                    <p title={user?.nickname || user?.name || "-"} className="rgb-user-name truncate text-[15px] font-semibold leading-tight">{user?.nickname || user?.name || "-"}</p>
                    <p title={user?.email || "-"} className="text-xs text-muted-foreground truncate mt-1.5">{user?.email || "-"}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onSelect={(event) => { event.preventDefault(); setAccountSettingsOpen(true); }} className="cursor-pointer">
                  <UserRoundCog className="mr-2 h-4 w-4" />
                  <span>Cài đặt tài khoản</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={(event) => { event.preventDefault(); setSupportOpen(true); }} className="cursor-pointer text-cyan-400 focus:text-cyan-300">
                  <Headphones className="mr-2 h-4 w-4" />
                  <span>Liên hệ hỗ trợ</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map(item => {
                const isActive = isMenuItemActive(location, item.path);
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-[38px] rounded-xl transition-all font-normal ${isActive ? "glass-active-item" : "hover:bg-white/5 hover:text-primary"}`}
                    >
                      <item.icon className={`h-4 w-4 ${isActive ? "text-primary drop-shadow-[0_0_6px_rgba(74,222,128,0.8)]" : ""}`} />
                      <span>{item.label}</span>
                      {item.path === "/chyusen" && unreadChyusenCount > 0 && (
                        <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white group-data-[collapsible=icon]:hidden">
                          {unreadChyusenCount > 99 ? "99+" : unreadChyusenCount}
                        </span>
                      )}
                    </SidebarMenuButton>
                    {item.path === "/chyusen" && unreadChyusenCount > 0 && (
                      <span className="absolute right-1 top-1 hidden h-2 w-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.9)] group-data-[collapsible=icon]:block" />
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="border-t border-white/10 p-3">
            <button
              onClick={logout}
              aria-label="Đăng xuất"
              className="flex h-11 w-full items-center gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-3 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/20 focus:outline-none group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" />
              <span className="group-data-[collapsible=icon]:hidden">Đăng xuất</span>
            </button>
            <AccountSettingsDialog open={accountSettingsOpen} onOpenChange={setAccountSettingsOpen} user={user} />
            <SupportDialog open={supportOpen} onOpenChange={setSupportOpen} />
          </SidebarFooter>
        </Sidebar>
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={isCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
          title={isCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
          className="absolute right-[-13px] top-[26px] z-50 hidden h-[29px] w-[29px] items-center justify-center rounded-full border border-white/25 bg-[#2a2c34]/80 text-white shadow-[0_8px_20px_rgba(0,0,0,0.5)] backdrop-blur-md transition-colors hover:bg-[#2a2c34] focus:outline-none md:flex"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
        <div
          className={`absolute top-0 right-1 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => { if (!isCollapsed) setIsResizing(true); }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (pullDistance > 0 || isRefreshing) && <div className="fixed left-1/2 top-2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full border border-primary/40 bg-background/95 px-3 py-1.5 text-xs font-medium text-primary shadow-lg backdrop-blur"><RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />{isRefreshing ? "Đang làm mới..." : pullDistance >= 72 ? "Thả để làm mới" : "Kéo xuống để làm mới"}</div>}
        <div className="sticky top-0 z-40 px-3 pt-[calc(env(safe-area-inset-top,0px)+10px)] md:px-5">
          <div className="flex min-h-14 items-center justify-between rounded-2xl border border-white/10 bg-background/70 px-3 shadow-[0_12px_32px_rgba(0,0,0,0.32)] backdrop-blur-xl backdrop-saturate-150">
          <div className="flex items-center gap-2 sidebar-mobile-trigger left-0">
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Mở menu"
              className="flex h-12 w-12 min-h-12 min-w-12 items-center justify-center rounded-xl bg-sidebar-accent/15 shadow-sm transition-colors hover:bg-sidebar-accent/25"
            >
              <PanelLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-medium text-foreground">
              {activeMenuItem?.label ?? "Menu"}
            </span>
          </div>
          <span className="sidebar-desktop-label text-sm font-medium text-muted-foreground">{activeMenuItem?.label ?? "TCG Manager"}</span>
          <NotificationCenter />
          </div>
        </div>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </>
  );
}
