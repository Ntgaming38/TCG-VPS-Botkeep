import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { BarChart3, TrendingUp, Package, DollarSign, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { formatSignedYen, formatYen } from "@shared/formatYen";
import { ProductTypeBadge } from "@/components/ProductTypeBadge";

export default function Reports() {
  const { data: report } = trpc.reports.overview.useQuery();

  const totalBought = report?.totalBought ?? 0;
  const totalSold = report?.totalSold ?? 0;
  const totalProfit = report?.totalProfit ?? 0;
  const roi = report?.roi ?? 0;
  const topProducts = report?.topProducts ?? [];
  const monthlyData = report?.monthlyData ?? [];

  const exportCSV = () => {
    if (!report) {
      toast.error("Chưa có dữ liệu để xuất");
      return;
    }

    // Build CSV content
    let csv = "\uFEFF"; // BOM for Excel UTF-8
    csv += "BÁO CÁO KINH DOANH POKÉMON TRADING\n\n";
    csv += "TỔNG QUAN\n";
    csv += `Tổng đã mua,"${formatYen(totalBought)}"\n`;
    csv += `Tổng đã bán,"${formatYen(totalSold)}"\n`;
    csv += `Lợi nhuận,"${formatYen(totalProfit)}"\n`;
    csv += `ROI,${roi.toFixed(1)}%\n\n`;

    if (monthlyData.length > 0) {
      csv += "LỢI NHUẬN THEO THÁNG\n";
      csv += "Tháng,Lợi nhuận (¥)\n";
      monthlyData.forEach((item: any) => {
        csv += `${item.month},${item.profit}\n`;
      });
      csv += "\n";
    }

    if (topProducts.length > 0) {
      csv += "TOP SẢN PHẨM SINH LỜI\n";
      csv += "STT,Tên sản phẩm,Loại,Lợi nhuận (¥)\n";
      topProducts.forEach((p: any, i: number) => {
        csv += `${i + 1},${p.name},${p.type},${Number(p.profit).toLocaleString()}\n`;
      });
    }

    // Download
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bao-cao-pokemon-trading-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Đã xuất báo cáo CSV!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Báo Cáo</h1>
          <p className="text-muted-foreground text-sm mt-1">Phân tích hiệu quả kinh doanh</p>
        </div>
        <Button onClick={exportCSV} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Xuất CSV
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card neon-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tổng đã mua</p>
                <p className="text-lg font-bold">{formatYen(totalBought)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card neon-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tổng đã bán</p>
                <p className="text-lg font-bold">{formatYen(totalSold)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card neon-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-yellow-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lợi nhuận</p>
                <p className={`text-lg font-bold ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatSignedYen(totalProfit)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card neon-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Package className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ROI</p>
                <p className="text-lg font-bold">{roi.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Chart */}
      <Card className="bg-card neon-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Lợi nhuận theo tháng</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={12} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1a3e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                  <Bar dataKey="profit" fill="#FFCB05" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Chưa có dữ liệu để hiển thị
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Products */}
      <Card className="bg-card neon-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Top sản phẩm sinh lời</CardTitle>
        </CardHeader>
        <CardContent>
          {topProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Chưa có dữ liệu
            </div>
          ) : (
            <div className="space-y-3">
              {topProducts.map((product: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-primary w-6">{i + 1}.</span>
                    <div>
                      <p className="text-sm font-medium">{product.name}</p>
                      <div className="mt-1"><ProductTypeBadge type={product.type} compact /></div>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-green-400">{formatSignedYen(Number(product.profit))}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
