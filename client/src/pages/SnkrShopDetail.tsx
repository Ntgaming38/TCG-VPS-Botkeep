import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { trpc } from "@/lib/trpc";
import { formatYen } from "@shared/formatYen";
import { ProductImageAdjuster } from "@/components/ProductImageAdjuster";
import { ArrowLeft, BarChart3, ExternalLink, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { useLocation, useRoute } from "wouter";

type DetailItem = { id: number; name: string; productType: "card" | "box" | "pack"; cardRank: string | null; sourceUrl: string; sourceTitle: string | null; imageUrl: string | null; imageZoom: string | number | null; imagePositionX: string | number | null; imagePositionY: string | number | null; currentPrice: string | number; lastSyncedAt: Date | null; lastSyncError: string | null };
type PricePoint = { id: number; price: string | number; createdAt: Date };
type QuantityPrice = { quantity: number | null; label: string; price: number; listingCount: number | null };
const chartConfig = { price: { label: "Giá SNKRDUNK", color: "#14b8a6" } } satisfies ChartConfig;

function typeLabel(type: DetailItem["productType"]) { return type === "card" ? "Card" : type === "box" ? "Box" : "Pack"; }

export default function SnkrShopDetail() {
  const [, params] = useRoute("/shop-snkr/:id");
  const [, setLocation] = useLocation();
  const itemId = Number(params?.id);
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [imageFailed, setImageFailed] = useState(false);
  const utils = trpc.useUtils();
  const queryEnabled = Number.isInteger(itemId) && itemId > 0;
  const itemQuery = trpc.snkrShop.get.useQuery({ id: itemId }, { enabled: queryEnabled });
  const historyQuery = trpc.snkrShop.priceHistory.useQuery({ id: itemId, days }, { enabled: queryEnabled });
  const quantityQuery = trpc.snkrShop.quantityPrices.useQuery({ id: itemId }, { enabled: Boolean(itemQuery.data), retry: 1 });
  const sync = trpc.snkrShop.sync.useMutation({
    onSuccess: (result) => {
      toast.success(`Đã cập nhật ${result.name}: ${formatYen(result.currentPrice)}`);
      void itemQuery.refetch();
      void historyQuery.refetch();
      void quantityQuery.refetch();
      void utils.snkrShop.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const item = itemQuery.data as DetailItem | undefined;
  const history = (historyQuery.data ?? []) as PricePoint[];
  const quantityPrices = (quantityQuery.data ?? []) as QuantityPrice[];
  const chartData = useMemo(() => history.map((point) => ({ price: Number(point.price) || 0, date: new Date(point.createdAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) })), [history]);

  if (itemQuery.isLoading) return <div className="flex h-72 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-teal-300" /></div>;
  if (!item) return <div className="rounded-2xl border border-dashed border-border py-20 text-center"><p className="text-sm text-muted-foreground">Không tìm thấy sản phẩm theo dõi.</p><Button variant="outline" className="mt-4" onClick={() => setLocation("/shop-snkr")}>Quay lại Shop SNKR</Button></div>;

  const price = Number(item.currentPrice) || 0;
  const title = item.sourceTitle || item.name;
  return <div className="mx-auto max-w-6xl space-y-5 pb-8">
    <div className="flex items-center justify-between gap-3"><Button variant="ghost" onClick={() => setLocation("/shop-snkr")} className="-ml-2 text-muted-foreground hover:text-foreground"><ArrowLeft className="mr-2 h-5 w-5" />Shop SNKR</Button><a href={item.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-lg border border-border bg-card px-3 text-sm font-medium text-teal-200 hover:bg-teal-500/10"><ExternalLink className="mr-2 h-4 w-4" />Mở SNKRDUNK</a></div>

    <section className="grid gap-5 rounded-3xl border border-border bg-card p-4 shadow-sm md:grid-cols-[minmax(260px,0.75fr)_minmax(0,1.25fr)] md:p-6">
      <ProductImageAdjuster entity="snkr" id={item.id} kind={item.productType === "card" ? "card" : "box-pack"} src={item.imageUrl} initialZoom={item.imageZoom} initialPositionX={item.imagePositionX} initialPositionY={item.imagePositionY} alt={item.imageUrl ? title : `${title} — chưa có ảnh`} className="rounded-2xl border border-white md:min-h-[390px]" eager referrerPolicy="no-referrer" />
      <div className="flex min-w-0 flex-col py-1">
        <div className="mb-3 flex flex-wrap gap-2"><Badge variant="outline" className="border-teal-500/30 bg-teal-500/10 text-teal-100">{typeLabel(item.productType)}</Badge>{item.productType === "card" && item.cardRank && <Badge variant="outline" className="border-amber-400/30 bg-amber-400/10 text-amber-100">Rank {item.cardRank}</Badge>}<Badge variant="outline" className="border-border bg-background text-muted-foreground">Theo dõi giá độc lập</Badge></div>
        <h1 className="break-words text-xl font-black leading-tight text-foreground sm:text-2xl md:text-3xl">{title}</h1>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs text-muted-foreground">Giá 1 đơn vị đang theo dõi</p><p className="mt-1 text-3xl font-black tracking-tight text-teal-300 sm:text-4xl">{price > 0 ? formatYen(price) : "Chưa có giá"}</p></div><p className="max-w-[13rem] text-right text-[11px] leading-4 text-muted-foreground">{item.lastSyncedAt ? `Cập nhật ${new Date(item.lastSyncedAt).toLocaleString("vi-VN")}` : "Chưa từng đồng bộ"}</p></div>

        <QuantityPriceGrid productType={item.productType} prices={quantityPrices} loading={quantityQuery.isLoading || quantityQuery.isFetching} />
        {item.lastSyncError && <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs leading-5 text-red-200">{item.lastSyncError}</p>}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row"><Button onClick={() => sync.mutate({ id: item.id })} disabled={sync.isPending} className="sm:w-auto bg-teal-500 font-semibold text-slate-950 hover:bg-teal-400">{sync.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Đồng bộ giá mới</Button><p className="flex min-w-0 items-start gap-2 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" />Sản phẩm này chỉ dùng để theo dõi giá, không được đưa vào Kho Hàng hoặc báo cáo tài chính.</p></div>
      </div>
    </section>

    <CompactPriceHistory history={history} chartData={chartData} loading={historyQuery.isLoading} days={days} onDaysChange={setDays} />
  </div>;
}

function QuantityPriceGrid({ productType, prices, loading }: { productType: DetailItem["productType"]; prices: QuantityPrice[]; loading: boolean }) {
  const unitLabel = productType === "card" ? "Card" : productType === "pack" ? "Pack" : "Box";
  return <section className="mt-5 rounded-2xl border border-teal-500/20 bg-slate-950/25 p-3"><div className="mb-2 flex items-center justify-between gap-3"><div><h2 className="text-sm font-bold text-foreground">Giá theo số lượng</h2><p className="mt-0.5 text-[11px] text-muted-foreground">Mức giá JPY công khai trên SNKRDUNK, tối đa 10 {unitLabel.toLowerCase()}.</p></div>{loading && <Loader2 className="h-4 w-4 animate-spin text-teal-300" />}</div>{prices.length > 0 ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">{prices.map((choice, index) => <div key={`${choice.label}-${choice.price}-${index}`} className="min-w-0 rounded-xl border border-white/10 bg-card/70 px-2 py-2 text-center shadow-sm"><p className="truncate text-[11px] font-medium text-muted-foreground">{choice.label}</p><p className="mt-0.5 truncate text-sm font-black text-teal-200">{formatYen(choice.price)}</p>{choice.listingCount !== null && <p className="mt-0.5 text-[10px] text-muted-foreground">{choice.listingCount.toLocaleString("vi-VN")} lượt bán</p>}</div>)}</div> : <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs leading-5 text-muted-foreground">{loading ? "Đang đọc các lựa chọn giá công khai..." : `Nguồn hiện chưa công bố giá JPY theo số lượng cho ${unitLabel}. Hệ thống không tự ước tính giá.`}</p>}</section>;
}

function CompactPriceHistory({ history, chartData, loading, days, onDaysChange }: { history: PricePoint[]; chartData: { price: number; date: string }[]; loading: boolean; days: 7 | 30 | 90; onDaysChange: (value: 7 | 30 | 90) => void }) {
  return <section className="rounded-2xl border border-border bg-card p-4 shadow-sm md:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-base font-bold text-foreground"><BarChart3 className="h-4 w-4 text-teal-300" />Lịch sử biến động giá</h2><p className="mt-1 text-xs text-muted-foreground">Biểu đồ nhỏ từ các lần đồng bộ riêng của sản phẩm này.</p></div><div className="flex gap-1">{([7, 30, 90] as const).map((value) => <Button key={value} size="sm" variant={days === value ? "default" : "outline"} onClick={() => onDaysChange(value)} className={`h-8 px-2.5 text-xs ${days === value ? "bg-teal-500 text-slate-950 hover:bg-teal-400" : "border-border bg-background"}`}>{value} ngày</Button>)}</div></div>{loading ? <div className="flex h-44 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-teal-300" /></div> : history.length === 0 ? <div className="py-10 text-center text-xs text-muted-foreground">Chưa có biến động giá. Đồng bộ thêm để xây dựng biểu đồ.</div> : <ChartContainer config={chartConfig} className="mt-3 h-[170px] w-full sm:h-[190px]"><LineChart data={chartData} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}><CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.45} /><XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} minTickGap={28} /><YAxis tickLine={false} axisLine={false} width={54} tick={{ fontSize: 10 }} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} /><ChartTooltip content={<ChartTooltipContent hideLabel formatter={(value) => formatYen(Number(value))} />} /><Line type="monotone" dataKey="price" stroke="var(--color-price)" strokeWidth={2.4} dot={false} activeDot={{ r: 4 }} /></LineChart></ChartContainer>}</section>;
}
