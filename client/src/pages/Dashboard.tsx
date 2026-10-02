import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { TrendingUp, TrendingDown, Minus, Package, ShoppingCart, DollarSign, BarChart3, Activity, PackageCheck, PackageOpen, Ticket, Clock3, ExternalLink, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { RarityBadge } from "@/components/RarityBadge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatYen } from "@shared/formatYen";

// Sample chart data - will be replaced with real data from API
const monthlyData = [
  { month: "T1", revenue: 0, profit: 0 },
  { month: "T2", revenue: 0, profit: 0 },
  { month: "T3", revenue: 0, profit: 0 },
  { month: "T4", revenue: 0, profit: 0 },
  { month: "T5", revenue: 0, profit: 0 },
  { month: "T6", revenue: 0, profit: 0 },
  { month: "T7", revenue: 0, profit: 0 },
  { month: "T8", revenue: 0, profit: 0 },
];

function MetricInfo({ label, children }: { label: string; children: React.ReactNode }) {
  return <Popover><PopoverTrigger asChild><button type="button" aria-label={`Giải thích ${label}`} className="absolute right-2.5 top-2.5 z-10 rounded-full p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Info className="h-5 w-5" /></button></PopoverTrigger><PopoverContent side="top" align="end" className="w-72 border-border bg-popover p-3 text-popover-foreground"><p className="font-semibold">{label}</p><div className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted-foreground">{children}</div></PopoverContent></Popover>;
}

function MonthlyTrend({ trend, label }: { trend: { percent: number | null; direction: "up" | "down" | "flat" | "new" }; label: string }) {
  if (trend.direction === "new") return <p className="mt-1 flex items-center gap-1 text-xs font-medium text-blue-400"><TrendingUp className="h-3.5 w-3.5" />Mới trong tháng này</p>;
  const Icon = trend.direction === "up" ? TrendingUp : trend.direction === "down" ? TrendingDown : Minus;
  const tone = trend.direction === "up" ? "text-green-400" : trend.direction === "down" ? "text-red-400" : "text-muted-foreground";
  const prefix = trend.direction === "up" ? "+" : "";
  return <p className={`mt-1 flex items-center gap-1 text-xs font-medium ${tone}`}><Icon className="h-3.5 w-3.5" />{prefix}{trend.percent ?? 0}% so với tháng trước <span className="sr-only">({label})</span></p>;
}

export default function Dashboard() {
  const { data: stats } = trpc.dashboard.stats.useQuery();
  const [, setLocation] = useLocation();

  const totalCapital = stats?.totalCapital ?? 0;
  const currentValue = stats?.currentValue ?? 0;
  const totalProfit = stats?.totalProfit ?? 0;
  const profitPrefix = totalProfit > 0 ? "+ " : totalProfit < 0 ? "- " : "";
  const profitSuffix = " ¥";
  const profitPrefixTone = totalProfit > 0 ? "text-green-400" : totalProfit < 0 ? "text-red-400" : "text-muted-foreground";
  const profitAmount = Math.abs(totalProfit);
  const capitalByType = stats?.capitalByType ?? { card: 0, box: 0, pack: 0, junk_pack: 0 };
  const currentValueByType = stats?.currentValueByType ?? { card: 0, box: 0, pack: 0, junk_pack: 0 };
  const profitByType = stats?.profitByType ?? { card: 0, box: 0, pack: 0, junk_pack: 0 };
  const monthlyTrends = stats?.monthlyTrends ?? {
    capital: { percent: 0, direction: "flat" as const }, currentValue: { percent: 0, direction: "flat" as const }, profit: { percent: 0, direction: "flat" as const }, inStock: { percent: 0, direction: "flat" as const }, sold: { percent: 0, direction: "flat" as const },
  };
  const totalInStock = stats?.totalInStock ?? 0;
  const inStockCards = stats?.inStockCards ?? 0;
  const inStockBoxes = stats?.inStockBoxes ?? 0;
  const inStockPacks = stats?.inStockPacks ?? 0;
  const inStockJunkPacks = stats?.inStockJunkPacks ?? 0;
  const totalSold = stats?.totalSold ?? 0;
  const soldCards = stats?.soldCards ?? 0;
  const soldBoxes = stats?.soldBoxes ?? 0;
  const soldPacks = stats?.soldPacks ?? 0;
  const soldJunkPacks = stats?.soldJunkPacks ?? 0;
  const recentActivities = stats?.recentActivities ?? [];
  const chartData = stats?.chartData ?? monthlyData;
  const cardRarityStats = stats?.cardRarityStats ?? [];
  const chyusen = stats?.chyusen ?? { open: 0, expiring: 0, deadlineToday: false, deadlineTomorrow: false, waitingResult: 0, won: 0, lost: 0 };
  const chyusenNearestDeadline = stats?.chyusenNearestDeadline ?? null;
  const chyusenRegisterNow = stats?.chyusenRegisterNow ?? null;
  const chyusenReminders = stats?.chyusenReminders ?? [];

  return (
    <div className="space-y-6">
      <div>
      <h1 className="text-2xl font-bold text-foreground">TCG Manager</h1>
        <p className="text-muted-foreground text-sm mt-1">Tổng quan tình hình kinh doanh của bạn</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 [&>div]:relative">
        <Card className="bg-card neon-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2"><p className="text-sm text-muted-foreground">Tổng vốn</p><MetricInfo label="Tổng vốn"><p>Giá mua × số lượng còn trong kho.</p><p>Card {formatYen(capitalByType.card)} + Box {formatYen(capitalByType.box)} + Pack {formatYen(capitalByType.pack)} + <span className="font-semibold text-amber-200">Pack Rác {formatYen(capitalByType.junk_pack)}</span>.</p><p className="font-medium text-foreground">= {formatYen(totalCapital)}</p></MetricInfo></div>
                <p className="mt-1 text-2xl font-bold"><span className="rgb-dashboard-value">{formatYen(totalCapital)}</span></p>
                <MonthlyTrend trend={monthlyTrends.capital} label="Tổng vốn" />
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card neon-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2"><p className="text-sm text-muted-foreground">Giá trị hiện tại</p><MetricInfo label="Giá trị hiện tại"><p>Giá thị trường × số lượng còn trong kho; nếu chưa có giá thị trường, hệ thống dùng giá mua.</p><p>Card {formatYen(currentValueByType.card)} + Box {formatYen(currentValueByType.box)} + Pack {formatYen(currentValueByType.pack)} + <span className="font-semibold text-amber-200">Pack Rác {formatYen(currentValueByType.junk_pack)}</span>.</p><p className="font-medium text-foreground">= {formatYen(currentValue)}</p></MetricInfo></div>
                <p className="mt-1 text-2xl font-bold"><span className="rgb-dashboard-value">{formatYen(currentValue)}</span></p>
                <MonthlyTrend trend={monthlyTrends.currentValue} label="Giá trị hiện tại" />
              </div>
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card neon-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2"><p className="text-sm text-muted-foreground">Lợi nhuận</p><MetricInfo label="Lợi nhuận"><p>Tổng lợi nhuận của các giao dịch đã bán: doanh thu − giá vốn.</p><p>Card {formatYen(profitByType.card)} + Box {formatYen(profitByType.box)} + Pack {formatYen(profitByType.pack)} + <span className="font-semibold text-amber-200">Pack Rác {formatYen(profitByType.junk_pack)}</span>.</p><p className="font-medium text-foreground">= {formatYen(totalProfit)}</p></MetricInfo></div>
                <p className="mt-1 text-2xl font-bold">
                  <span className={profitPrefixTone}>{profitPrefix}</span><span className={totalProfit < 0 ? "profit-negative-amount" : "rgb-profit-amount"}>{profitAmount.toLocaleString()}</span><span className={profitPrefixTone}>{profitSuffix}</span>
                </p>
                <MonthlyTrend trend={monthlyTrends.profit} label="Lợi nhuận tháng này" />
              </div>
              <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card neon-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2"><p className="text-sm text-muted-foreground">Tổng sản phẩm trong kho</p><MetricInfo label="Tổng sản phẩm trong kho"><p>Tổng số lượng sản phẩm có trạng thái Trong kho.</p><p>Card {inStockCards} + Box {inStockBoxes} + Pack {inStockPacks} + Pack Rác {inStockJunkPacks}.</p><p className="font-medium text-foreground">= {totalInStock} sản phẩm</p></MetricInfo></div>
                <p className="mt-1 text-2xl font-bold"><span className="rgb-dashboard-value">{totalInStock}</span></p>
                <MonthlyTrend trend={monthlyTrends.inStock} label="Sản phẩm trong kho" />
                <p className="text-xs text-muted-foreground mt-0.5">
                  Card: {inStockCards} | Box: {inStockBoxes} | Pack: {inStockPacks} | <span className="font-semibold text-amber-200">Pack Rác: {inStockJunkPacks}</span>
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-400/30 bg-card neon-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2"><p className="text-sm text-muted-foreground">Pack Rác hiện có</p><MetricInfo label="Pack Rác hiện có"><p>Tổng số lượng Pack Rác đang có trạng thái Trong kho.</p><p>Pack Rác được quản lý riêng và không được gộp với Pack thông thường.</p><p className="font-medium text-amber-200">= {inStockJunkPacks} Pack Rác</p></MetricInfo></div>
                <p className="mt-1 text-2xl font-bold text-amber-300">{inStockJunkPacks}</p>
                <p className="mt-1 text-xs font-medium text-amber-200/85">Đang trong kho</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-500/15 flex items-center justify-center">
                <PackageOpen className="h-5 w-5 text-amber-300" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card neon-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2"><p className="text-sm text-muted-foreground">Tổng sản phẩm đã bán</p><MetricInfo label="Tổng sản phẩm đã bán"><p>Tổng số lượng trong các giao dịch Bán Hàng đã lưu.</p><p>Card {soldCards} + Box {soldBoxes} + Pack {soldPacks} + Pack Rác {soldJunkPacks}.</p><p className="font-medium text-foreground">= {totalSold} sản phẩm</p></MetricInfo></div>
                <p className="mt-1 text-2xl font-bold"><span className="dashboard-sold-value">{totalSold}</span></p>
                <MonthlyTrend trend={monthlyTrends.sold} label="Sản phẩm bán tháng này" />
                <p className="text-xs text-muted-foreground mt-0.5">
                  Card: {soldCards} | Box: {soldBoxes} | Pack: {soldPacks} | <span className="font-semibold text-amber-200">Pack Rác: {soldJunkPacks}</span>
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <PackageCheck className="h-5 w-5 text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-red-100 bg-card neon-card">
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <div><CardTitle className="flex items-center gap-2 text-base font-semibold"><Ticket className="h-4 w-4 text-red-600" />抽選</CardTitle><p className="mt-1 text-sm text-muted-foreground">Tóm tắt chương trình Lottery / Chūsen của bạn.</p></div>
          <Button variant="outline" size="sm" onClick={() => setLocation("/chyusen")}>Quản lý Chyusen</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[{ label: "Chờ kết quả", value: chyusen.waitingResult, color: "text-green-400", surface: "border-border bg-background", filter: "dashboard_waiting" }, { label: "Sắp hết hạn", value: chyusen.expiring, color: "text-yellow-400", surface: "border-border bg-background", filter: "dashboard_expiring", isExpiring: true }, { label: "Đã trúng", value: chyusen.won, color: "text-red-500", surface: "border-border bg-background", filter: "dashboard_won" }, { label: "Đã trượt", value: chyusen.lost, color: "text-white", surface: "border-border bg-background", filter: "dashboard_lost" }].map((item) => {
              return <div key={item.label} className={`rounded-lg border px-3 py-3 transition duration-200 ${item.surface}`}><button type="button" onClick={() => setLocation(`/chyusen?filter=${item.filter}`)} className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background" aria-label={`Xem ${item.label}`}><p className="text-xs text-muted-foreground">{item.label}</p><p className={`mt-1 text-xl font-bold ${item.color}`}>{item.value}</p>{item.isExpiring && chyusen.deadlineToday && <p className="mt-1 text-xs font-semibold text-red-600">Hôm nay là hạn cuối</p>}{item.isExpiring && chyusen.deadlineTomorrow && <p className="mt-1 text-xs font-semibold text-amber-700">Còn 1 ngày</p>}{item.isExpiring && chyusenNearestDeadline && <p className="mt-2 truncate text-[11px] font-medium text-muted-foreground" title={chyusenNearestDeadline.title}>Gần nhất: {chyusenNearestDeadline.title}</p>}</button>{item.isExpiring && chyusenRegisterNow?.sourceUrl && <Button asChild size="sm" className="mt-3 h-8 w-full bg-red-600 text-xs text-white hover:bg-red-700"><a href={chyusenRegisterNow.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Đăng ký ngay: ${chyusenRegisterNow.title}`}><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Đăng ký ngay</a></Button>}</div>;
            })}
          </div>
          {chyusenReminders.length > 0 && <div className="space-y-2"><p className="text-sm font-medium">Chyusen sắp hết hạn</p>{chyusenReminders.map((entry: any) => <div key={entry.id} className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-semibold text-amber-950">{entry.title}</p><p className="mt-0.5 flex items-center gap-1 text-xs text-amber-800"><Clock3 className="h-3.5 w-3.5" />{entry.remainingTime || "Sắp hết hạn"} · {entry.shop || "Khác"}</p></div>{entry.sourceUrl && <Button asChild variant="outline" size="sm" className="border-amber-300 bg-white"><a href={entry.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Đăng ký</a></Button>}</div>)}</div>}
        </CardContent>
      </Card>

      <Card className="bg-card neon-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Card trong kho theo độ hiếm</CardTitle>
          <p className="text-sm text-muted-foreground">Tổng số lượng Card đang còn trong kho, theo thứ tự độ hiếm.</p>
        </CardHeader>
        <CardContent>
          {cardRarityStats.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">Chưa có Card trong kho để thống kê độ hiếm.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {cardRarityStats.map((item: { rarity: string; quantity: number }) => (
                <div key={item.rarity} className="flex min-w-[108px] items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 shadow-sm">
                  <RarityBadge rarity={item.rarity} />
                  <span className="text-sm font-bold text-foreground">{item.quantity}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card neon-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Doanh thu theo tháng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={12} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a3e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#FFCB05" fill="#FFCB05" fillOpacity={0.1} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card neon-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Lợi nhuận theo tháng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={12} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a3e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="profit" fill="#4ade80" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card className="bg-card neon-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Hoạt động gần đây
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Chưa có hoạt động nào</p>
              <p className="text-xs mt-1">Bắt đầu bằng cách thêm sản phẩm hoặc tạo giao dịch mua</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivities.map((activity: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Activity className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">{new Date(activity.createdAt).toLocaleString('vi-VN')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
