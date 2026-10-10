import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  BarChart3, LogOut, PanelLeft, CreditCard, Box, Gift,
  Warehouse, ShoppingCart, DollarSign, TrendingUp, FileText, LayoutDashboard, Ticket, Settings, History
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { SidebarAIAssistant } from "./SidebarAIAssistant";
import { trpc } from "@/lib/trpc";
import { getUnreadChyusenCount } from "@shared/chyusenNotifications";
import { shouldOpenMobileSidebarFromSwipe } from "@shared/mobileSidebarGesture";
import { NotificationCenter } from "./NotificationCenter";

const menuItems = [
  { icon: LayoutDashboard, label: "TCG Manager", path: "/thong-ke" },
  { icon: CreditCard, label: "Card", path: "/san-pham/card" },
  { icon: Box, label: "Box", path: "/san-pham/box" },
  { icon: Gift, label: "Pack", path: "/san-pham/pack" },
  { icon: Warehouse, label: "Kho Hàng", path: "/kho-hang" },
  { icon: ShoppingCart, label: "Mua Hàng", path: "/mua-hang" },
  { icon: DollarSign, label: "Bán Hàng", path: "/ban-hang" },
  { icon: TrendingUp, label: "Marketplace", path: "/marketplace" },
  { icon: Ticket, label: "抽選", path: "/chyusen" },
  { icon: History, label: "Lịch Sử", path: "/lich-su" },
  { icon: FileText, label: "Báo Cáo", path: "/bao-cao" },
  { icon: Settings, label: "Cài đặt", path: "/cai-dat" },
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
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
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
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => location.startsWith(item.path));
  const isMobile = useIsMobile();
  const { data: chyusenNotifications = [] } = trpc.chyusen.notifications.useQuery(undefined, { staleTime: 60_000 });
  const unreadChyusenCount = getUnreadChyusenCount(chyusenNotifications);

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

          <SidebarFooter className="p-3">
            <SidebarAIAssistant />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-sidebar-accent transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none">
                  <Avatar className="h-9 w-9 border border-border shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-primary/20 text-primary">
                      {user?.name?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">{user?.name || "-"}</p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">{user?.email || "-"}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Đăng xuất</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => { if (!isCollapsed) setIsResizing(true); }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
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
