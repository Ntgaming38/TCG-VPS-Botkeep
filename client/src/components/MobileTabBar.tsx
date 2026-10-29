import { Link, useLocation } from "wouter";
import { DollarSign, LayoutDashboard, ShoppingCart, Ticket, Warehouse } from "lucide-react";

/**
 * Thanh điều hướng dưới cho bản điện thoại (chỉ hiện dưới breakpoint md,
 * và DashboardLayout chỉ gắn nó khi isMobile). Kiểu kính nổi khớp với
 * sidebar/topbar kính hiện tại; mục đang mở có nền pill xanh. Mục Chyusen
 * mang chấm đỏ khi còn thông báo Chyusen chưa đọc — cùng nguồn số đếm
 * với chấm/badge ở sidebar.
 */
const TAB_ITEMS = [
  { icon: LayoutDashboard, label: "Thống kê", path: "/thong-ke" },
  { icon: Warehouse, label: "Kho hàng", path: "/kho-hang" },
  { icon: DollarSign, label: "Bán hàng", path: "/ban-hang" },
  { icon: ShoppingCart, label: "Mua hàng", path: "/mua-hang" },
  { icon: Ticket, label: "Chyusen", path: "/chyusen" },
] as const;

function isTabActive(location: string, path: string) {
  return location === path || location.startsWith(`${path}/`);
}

export default function MobileTabBar({ chyusenUnreadCount = 0 }: { chyusenUnreadCount?: number }) {
  const [location] = useLocation();
  return (
    <nav
      aria-label="Điều hướng nhanh"
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+10px)] z-50 flex rounded-[22px] border border-white/10 bg-[#101726]/80 p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.45)] backdrop-blur-2xl md:hidden"
    >
      {TAB_ITEMS.map((item) => {
        const active = isTabActive(location, item.path);
        const Icon = item.icon;
        return (
          <Link
            key={item.path}
            href={item.path}
            aria-current={active ? "page" : undefined}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 text-[10px] font-semibold transition-colors ${
              active ? "bg-sky-400/15 text-sky-300" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span className="relative">
              <Icon className="h-[21px] w-[21px]" />
              {item.path === "/chyusen" && chyusenUnreadCount > 0 && (
                <span className="absolute -right-2 -top-1 h-[7px] w-[7px] rounded-full bg-red-500 ring-2 ring-[#101726]" />
              )}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
