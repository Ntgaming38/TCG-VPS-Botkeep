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
  Warehouse, ShoppingCart, DollarSign, TrendingUp, FileText, LayoutDashboard, Ticket, Settings, History, Trash2
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
  { icon: History, label: "Lịch Sử", path: "/lich-su" },
  { icon: FileText, label: "Báo Cáo", path: "/bao-cao" },
  { icon: Settings, label: "Cài đặt", path: "/cai-dat" },
  { icon: Trash2, label: "Thùng rác", path: "/thung-rac" },
];

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
            src="/login-bg.png"
            alt="Pikachu và Lucario trên nền đăng nhập TCG Manager"
            className="login-background-image h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-slate-950/60" />
        </div>
        <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-8 p-8">
          <div className="flex flex-col items-center gap-4">
            <h1 className="pokemon-logo-text text-4xl">POKÉMON</h1>
            <p className="text-sm text-muted-foreground text-center">
              Đăng nhập để tiếp tục sử dụng TCG Manager
            </p>
          </div>
          <Button
            onClick={() => startLogin()}
            size="lg"
            className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-bold"
          >
            Đăng nhập
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
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const pullStartRef = useRef<{ x: number; y: number } | null>(null);
  const knownUnreadChyusenIdsRef = useRef<Set<number> | null>(null);
  const activeMenuItem = menuItems.find(item => location.startsWith(item.path));
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
      <div className="relative" ref={sidebarRef}>
          <Sidebar collapsible="icon" className="border-r-0" disableTransition={isResizing}>
          <SidebarHeader className="h-16 justify-center border-b border-primary/30">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-sidebar-accent rounded-lg transition-colors focus:outline-none shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-primary" />
              </button>
              {!isCollapsed && (
                <span className="tcg-logo-text text-lg tracking-wider font-black">TCG Manager</span>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map(item => {
                const isActive = location.startsWith(item.path);
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-10 transition-all font-normal ${isActive ? "neon-active-item" : "hover:text-primary"}`}
                    >
                      <item.icon className={`h-4 w-4 ${isActive ? "text-primary drop-shadow-[0_0_6px_rgba(74,222,128,0.8)]" : ""}`} />
                      <span>{item.label}</span>
                      {item.path === "/chyusen" && unreadChyusenCount > 0 && (
                        <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white group-data-[collapsible=icon]:hidden">
                          {unreadChyusenCount > 99 ? "99+" : unreadChyusenCount}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3 pt-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex min-h-16 w-full items-center gap-3.5 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-sidebar-accent focus:outline-none group-data-[collapsible=icon]:justify-center">
                  <Avatar className="h-11 w-11 shrink-0 border-2 bg-white" style={{ borderColor: user?.avatarBorderColor || undefined }}>
                    <AvatarImage src={user?.avatarUrl || undefined} alt={user?.nickname || user?.name || "Người dùng"} className="object-cover" />
                    <AvatarFallback className="text-xs font-medium bg-primary/20 text-primary">
                      {(user?.nickname || user?.name)?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 overflow-hidden group-data-[collapsible=icon]:hidden">
                    <p title={user?.nickname || user?.name || "-"} className="rgb-user-name truncate text-[15px] font-semibold leading-tight">{user?.nickname || user?.name || "-"}</p>
                    <p title={user?.email || "-"} className="text-xs text-muted-foreground truncate mt-1.5">{user?.email || "-"}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onSelect={(event) => { event.preventDefault(); setAccountSettingsOpen(true); }} className="cursor-pointer">
                  <UserRoundCog className="mr-2 h-4 w-4" />
                  <span>Cài đặt tài khoản</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Đăng xuất</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <AccountSettingsDialog open={accountSettingsOpen} onOpenChange={setAccountSettingsOpen} user={user} />
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => { if (!isCollapsed) setIsResizing(true); }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (pullDistance > 0 || isRefreshing) && <div className="fixed left-1/2 top-2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full border border-primary/40 bg-background/95 px-3 py-1.5 text-xs font-medium text-primary shadow-lg backdrop-blur"><RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />{isRefreshing ? "Đang làm mới..." : pullDistance >= 72 ? "Thả để làm mới" : "Kéo xuống để làm mới"}</div>}
        <div className="flex border-b border-primary/30 h-14 items-center justify-between bg-background/95 px-3 backdrop-blur sticky top-0 z-40">
          {isMobile ? (
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-12 w-12 min-h-12 min-w-12 rounded-xl bg-sidebar-accent/15 shadow-sm transition-colors hover:bg-sidebar-accent/25 [&>svg]:h-5 [&>svg]:w-5" />
              <span className="text-sm font-medium text-foreground">
                {activeMenuItem?.label ?? "Menu"}
              </span>
            </div>
          ) : <span className="text-sm font-medium text-muted-foreground">{activeMenuItem?.label ?? "TCG Manager"}</span>}
          <NotificationCenter />
        </div>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </>
  );
}
