import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Plus, Search, DollarSign, Calendar, TrendingUp, ArrowUpDown, ArrowUp, ArrowDown, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const PLATFORMS = [
  { value: "user", label: "Người Dùng" },
  { value: "snkrdunk", label: "SNKRDUNK" },
  { value: "mercari", label: "Mercari" },
  { value: "yahoo", label: "Yahoo Auction" },
  { value: "shop", label: "Card Shop" },
  { value: "offline", label: "Offline" },
  { value: "other", label: "Khác" },
];

type SortField = "date" | "price" | "name";
type SortDirection = "asc" | "desc";

export default function Sales() {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [editForm, setEditForm] = useState({ quantity: 1, salePrice: 0, note: "" });
  const [newSale, setNewSale] = useState({
    productId: 0, quantity: 1, salePrice: 0,
    platform: "user" as any, fee: 0, shippingFee: 0, otherCost: 0, note: "", isDamaged: false,
  });

  const utils = trpc.useUtils();
  const { data: sales, refetch } = trpc.sales.list.useQuery({ search: search || undefined });
  const { data: inventoryProducts } = trpc.products.inStock.useQuery();

  const invalidateAll = () => {
    utils.sales.list.invalidate();
    utils.products.list.invalidate();
    utils.products.inStock.invalidate();
    utils.dashboard.stats.invalidate();
    utils.reports.overview.invalidate();
    utils.purchases.list.invalidate();
  };

  const createSale = trpc.sales.create.useMutation({
    onSuccess: () => {
      toast.success("Đã tạo giao dịch bán thành công!");
      setShowAddDialog(false);
      setNewSale({ productId: 0, quantity: 1, salePrice: 0, platform: "user", fee: 0, shippingFee: 0, otherCost: 0, note: "", isDamaged: false });
      invalidateAll();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateSale = trpc.sales.update.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật giao dịch bán!");
      setShowEditDialog(false);
      setSelectedSale(null);
      invalidateAll();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteSale = trpc.sales.delete.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa giao dịch bán!");
      setShowDeleteConfirm(false);
      setSelectedSale(null);
      invalidateAll();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleEditClick = (sale: any) => {
    setSelectedSale(sale);
    setEditForm({
      quantity: sale.quantity,
      salePrice: Number(sale.totalRevenue),
      note: sale.note || "",
    });
    setShowEditDialog(true);
  };

  const handleDeleteClick = (sale: any) => {
    setSelectedSale(sale);
    setShowDeleteConfirm(true);
  };

  const handleEditSubmit = () => {
    if (!selectedSale) return;
    updateSale.mutate({
      saleId: selectedSale.id,
      quantity: editForm.quantity,
      salePrice: editForm.salePrice,
      note: editForm.note,
    });
  };

  const handleDeleteConfirm = () => {
    if (!selectedSale) return;
    deleteSale.mutate({ saleId: selectedSale.id });
  };

  const selectedProduct = inventoryProducts?.find((p: any) => p.id === newSale.productId);
  // salePrice is TOTAL price for the lot (not per-unit)
  const totalRevenue = newSale.salePrice;
  const totalCost = newSale.fee + newSale.shippingFee + newSale.otherCost;
  const netRevenue = totalRevenue - totalCost;
  const profit = selectedProduct ? netRevenue - (Number(selectedProduct.buyPrice) * newSale.quantity) : 0;

  // Sort sales
  const sortedSales = useMemo(() => {
    if (!sales || sales.length === 0) return [];
    const sorted = [...sales].sort((a: any, b: any) => {
      let cmp = 0;
      switch (sortField) {
        case "date":
          cmp = new Date(a.saleDate).getTime() - new Date(b.saleDate).getTime();
          break;
        case "price":
          cmp = Number(a.totalRevenue) - Number(b.totalRevenue);
          break;
        case "name":
          cmp = (a.productName || "").localeCompare(b.productName || "", "vi");
          break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [sales, sortField, sortDirection]);

  // Calculate totals for current list
  const totals = useMemo(() => {
    const totalRevenue = sortedSales.reduce((sum, s: any) => sum + Number(s.totalRevenue || 0), 0);
    const totalProfit = sortedSales.reduce((sum, s: any) => sum + Number(s.profit || 0), 0);
    return { totalRevenue, totalProfit, count: sortedSales.length };
  }, [sortedSales]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection(field === "name" ? "asc" : "desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />;
    return sortDirection === "asc"
      ? <ArrowUp className="h-3.5 w-3.5 text-primary" />
      : <ArrowDown className="h-3.5 w-3.5 text-primary" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bán Hàng</h1>
          <p className="text-muted-foreground text-sm mt-1">Quản lý giao dịch bán hàng</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Tạo giao dịch bán
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tạo giao dịch bán</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Chọn sản phẩm từ kho</Label>
                <Select value={newSale.productId ? String(newSale.productId) : ""} onValueChange={(v) => setNewSale(p => ({ ...p, productId: parseInt(v) }))}>
                  <SelectTrigger><SelectValue placeholder="Chọn sản phẩm..." /></SelectTrigger>
                  <SelectContent>
                    {inventoryProducts?.map((p: any) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name} ({p.type}) - SL: {p.quantity}{p.damagedQuantity > 0 ? ` (${p.damagedQuantity} hỏng)` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedProduct && (
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>Đang có: {selectedProduct.quantity} | Giá vốn: ¥{Number(selectedProduct.buyPrice).toLocaleString()}</p>
                    {selectedProduct.damagedQuantity > 0 && (
                      <p className="text-red-400 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Hàng hỏng: {selectedProduct.damagedQuantity} (có thể bán dạng rác với giá thấp hơn)
                      </p>
                    )}
                  </div>
                )}
              </div>
              {/* Toggle for selling damaged products */}
              {selectedProduct && selectedProduct.damagedQuantity > 0 && (
                <div className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <span className="text-sm text-red-400 font-medium">Bán hàng hỏng/rác</span>
                  </div>
                  <Switch
                    checked={newSale.isDamaged}
                    onCheckedChange={(checked) => setNewSale(p => ({ ...p, isDamaged: checked }))}
                  />
                </div>
              )}
              {newSale.isDamaged && selectedProduct && (
                <p className="text-xs text-red-400">
                  Đang bán từ kho hàng hỏng. Số lượng hỏng có sẵn: {selectedProduct.damagedQuantity}
                </p>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Số lượng bán</Label>
                  <Input type="number" min={1} max={newSale.isDamaged ? (selectedProduct?.damagedQuantity || 999) : ((selectedProduct?.quantity || 0) - (selectedProduct?.damagedQuantity || 0)) || 999} value={newSale.quantity} onChange={(e) => setNewSale(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))} />
                </div>
             <div className="space-y-2">
                  <Label>Tổng giá bán (¥)</Label>
                  <Input type="number" min={0} value={newSale.salePrice} onChange={(e) => setNewSale(p => ({ ...p, salePrice: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Nơi bán</Label>
                <Select value={newSale.platform} onValueChange={(v) => setNewSale(p => ({ ...p, platform: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map(pl => (
                      <SelectItem key={pl.value} value={pl.value}>{pl.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Phí nền tảng (¥)</Label>
                  <Input type="number" min={0} value={newSale.fee} onChange={(e) => setNewSale(p => ({ ...p, fee: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <Label>Phí ship (¥)</Label>
                  <Input type="number" min={0} value={newSale.shippingFee} onChange={(e) => setNewSale(p => ({ ...p, shippingFee: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <Label>Chi phí khác (¥)</Label>
                  <Input type="number" min={0} value={newSale.otherCost} onChange={(e) => setNewSale(p => ({ ...p, otherCost: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>
            <div className="p-3 bg-secondary/50 rounded-lg space-y-1">
                {newSale.quantity > 0 && newSale.salePrice > 0 && (
                  <p className="text-xs text-muted-foreground">Giá bán/SP: ¥{Math.round(newSale.salePrice / newSale.quantity).toLocaleString()}</p>
                )}
                <p className="text-sm text-muted-foreground">Doanh thu: <span className="font-medium text-foreground">¥{totalRevenue.toLocaleString()}</span></p>
                <p className="text-sm text-muted-foreground">Phí: <span className="font-medium text-foreground">-¥{totalCost.toLocaleString()}</span></p>
                <p className="text-sm text-muted-foreground">Thực nhận: <span className="font-medium text-foreground">¥{netRevenue.toLocaleString()}</span></p>
                {selectedProduct && (
                  <p className="text-sm text-muted-foreground">Giá vốn: <span className="font-medium text-foreground">-¥{(Number(selectedProduct.buyPrice) * newSale.quantity).toLocaleString()}</span></p>
                )}
                <p className={`text-sm font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  Lợi nhuận: {profit >= 0 ? '+' : ''}¥{profit.toLocaleString()}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Ghi chú</Label>
                <Textarea value={newSale.note} onChange={(e) => setNewSale(p => ({ ...p, note: e.target.value }))} placeholder="VD: Bán cho khách quen..." />
              </div>
              <Button
                className="w-full"
                onClick={() => createSale.mutate(newSale)}
                disabled={!newSale.productId || !newSale.salePrice || createSale.isPending}
              >
                {createSale.isPending ? "Đang lưu..." : "Lưu giao dịch bán"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm kiếm giao dịch bán..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground mr-1">Sắp xếp:</span>
          <Button
            variant={sortField === "date" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 px-2.5 text-xs gap-1"
            onClick={() => toggleSort("date")}
          >
            Ngày <SortIcon field="date" />
          </Button>
          <Button
            variant={sortField === "price" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 px-2.5 text-xs gap-1"
            onClick={() => toggleSort("price")}
          >
            Giá <SortIcon field="price" />
          </Button>
          <Button
            variant={sortField === "name" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 px-2.5 text-xs gap-1"
            onClick={() => toggleSort("name")}
          >
            Tên <SortIcon field="name" />
          </Button>
        </div>
      </div>

      {/* Sales List */}
      {sortedSales.length === 0 ? (
        <div className="text-center py-16">
          <DollarSign className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-medium text-muted-foreground">Chưa có giao dịch bán nào</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">Bấm "Tạo giao dịch bán" để bắt đầu</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedSales.map((sale: any) => (
            <Card key={sale.id} className="bg-card neon-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{sale.productName || 'Sản phẩm'}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {new Date(sale.saleDate).toLocaleDateString('vi-VN')}
                        <span>•</span>
                        {PLATFORMS.find(p => p.value === sale.platform)?.label || sale.platform}
                      </p>
                    </div>
                 </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-sm">¥{Number(sale.totalRevenue).toLocaleString()}</p>
                      <p className={`text-xs font-medium ${Number(sale.profit) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {Number(sale.profit) >= 0 ? '+' : ''}¥{Number(sale.profit).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-blue-400" onClick={() => handleEditClick(sale)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400" onClick={() => handleDeleteClick(sale)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Total Summary */}
          <Card className="bg-card border-primary/30 border-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-primary">Tổng kết</p>
                    <p className="text-xs text-muted-foreground">
                      {totals.count} giao dịch
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-primary">¥{totals.totalRevenue.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Tổng doanh thu</p>
                  <p className={`text-sm font-bold mt-0.5 ${totals.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {totals.totalProfit >= 0 ? '+' : ''}¥{totals.totalProfit.toLocaleString()} lợi nhuận
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
       </div>
      )}

      {/* Edit Sale Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>✏️ Sửa giao dịch bán</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4 mt-4">
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-sm font-medium">{selectedSale.productName}</p>
                <p className="text-xs text-muted-foreground">
                  Ngày: {new Date(selectedSale.saleDate).toLocaleDateString('vi-VN')} (không thể sửa)
                </p>
                <p className="text-xs text-muted-foreground">
                  Nền tảng: {PLATFORMS.find(p => p.value === selectedSale.platform)?.label || selectedSale.platform} (không thể sửa)
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Số lượng bán</Label>
                  <Input type="number" min={1} value={editForm.quantity} onChange={(e) => setEditForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))} />
                </div>
               <div className="space-y-2">
                  <Label>Tổng giá bán (¥)</Label>
                  <Input type="number" min={0} value={editForm.salePrice} onChange={(e) => setEditForm(f => ({ ...f, salePrice: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>
              {editForm.quantity > 0 && editForm.salePrice > 0 && (
                <div className="p-2 bg-secondary/30 rounded text-xs text-muted-foreground">
                  Giá bán/SP: ¥{Math.round(editForm.salePrice / editForm.quantity).toLocaleString()}
                </div>
              )}
              <div className="space-y-2">
                <Label>Ghi chú</Label>
                <Textarea value={editForm.note} onChange={(e) => setEditForm(f => ({ ...f, note: e.target.value }))} />
              </div>
              <Button className="w-full" onClick={handleEditSubmit} disabled={updateSale.isPending}>
                {updateSale.isPending ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>🗑 Bạn có chắc muốn xóa giao dịch này?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedSale && (
                <span>
                  Giao dịch bán <strong>{selectedSale.productName}</strong> ({selectedSale.quantity} SP - ¥{Number(selectedSale.totalRevenue).toLocaleString()}) sẽ bị xóa. Số lượng sẽ được hoàn lại vào kho.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
              disabled={deleteSale.isPending}
            >
              {deleteSale.isPending ? "Đang xóa..." : "Xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
