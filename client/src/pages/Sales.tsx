import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Plus, Search, DollarSign, Calendar, TrendingUp, ArrowUpDown, ArrowUp, ArrowDown, Pencil, Pin, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { formatSignedYen, formatYen } from "@shared/formatYen";
import { filterSalesByDateRange, summarizeSales } from "@shared/salesDateFilter";
import { getQuickSaleDateRange, type SaleQuickPeriod } from "@shared/salesQuickDateRange";
import { getSaleLocationSelectValue, resolveSaleLocationSelection } from "@shared/saleLocation";

const PLATFORMS = [
  { value: "user", label: "Người Dùng" },
  { value: "snkrdunk", label: "SNKRDUNK" },
  { value: "mercari", label: "Mercari" },
  { value: "yahoo", label: "Yahoo Auction" },
  { value: "shop", label: "Card Shop" },
  { value: "offline", label: "Offline" },
];
const ADD_SALE_LOCATION_VALUE = "__add_sale_location";

type SortField = "date" | "price" | "name";
type SortDirection = "asc" | "desc";

export default function Sales() {
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [quickPeriod, setQuickPeriod] = useState<SaleQuickPeriod | null>(null);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [editForm, setEditForm] = useState({ quantity: 1, salePrice: 0, note: "" });
  const [newSale, setNewSale] = useState({
    productId: 0, quantity: 1, salePrice: 0,
    platform: "user" as any, saleLocation: null as string | null, fee: 0, shippingFee: 0, otherCost: 0, note: "", isDamaged: false,
  });
  const [isAddingSaleLocation, setIsAddingSaleLocation] = useState(false);
  const [customSaleLocationName, setCustomSaleLocationName] = useState("");
  const [editingSaleLocation, setEditingSaleLocation] = useState<{ id: number; name: string } | null>(null);
  const [deleteSaleLocationId, setDeleteSaleLocationId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: sales, refetch } = trpc.sales.list.useQuery({ search: search || undefined });
  const { data: inventoryProducts } = trpc.products.inStock.useQuery();
  const { data: saleLocations = [] } = trpc.saleLocations.list.useQuery();
  const { data: recentSaleLocations = [] } = trpc.saleLocations.recent.useQuery();

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
      setNewSale({ productId: 0, quantity: 1, salePrice: 0, platform: "user", saleLocation: null, fee: 0, shippingFee: 0, otherCost: 0, note: "", isDamaged: false });
      invalidateAll();
    },
    onError: (err) => toast.error(err.message),
  });

  const saveSaleLocation = trpc.saleLocations.create.useMutation({
    onSuccess: (_result, variables) => {
      const name = variables.name.trim();
      setNewSale((current) => ({ ...current, platform: "other", saleLocation: name }));
      setCustomSaleLocationName("");
      setIsAddingSaleLocation(false);
      utils.saleLocations.list.invalidate();
      toast.success(`Đã lưu nơi bán ${name}.`);
    },
    onError: (error) => toast.error(error.message),
  });
  const updateSavedSaleLocation = trpc.saleLocations.update.useMutation({
    onSuccess: (data) => { setNewSale((current) => current.saleLocation === editingSaleLocation?.name ? { ...current, saleLocation: data.name } : current); setEditingSaleLocation(null); utils.saleLocations.list.invalidate(); utils.saleLocations.recent.invalidate(); toast.success("Đã cập nhật nơi bán."); },
    onError: (error) => toast.error(error.message),
  });
  const deleteSavedSaleLocation = trpc.saleLocations.delete.useMutation({
    onSuccess: () => { setDeleteSaleLocationId(null); utils.saleLocations.list.invalidate(); utils.saleLocations.recent.invalidate(); toast.success("Đã xóa nơi bán khỏi gợi ý."); },
    onError: (error) => toast.error(error.message),
  });
  const setSavedSaleLocationPinned = trpc.saleLocations.setPinned.useMutation({
    onSuccess: (data) => { utils.saleLocations.list.invalidate(); toast.success(data.isPinned ? "Đã ghim nơi bán lên đầu gợi ý." : "Đã bỏ ghim nơi bán."); },
    onError: (error) => toast.error(error.message),
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
  const saleLocationValue = isAddingSaleLocation ? ADD_SALE_LOCATION_VALUE : getSaleLocationSelectValue(newSale.platform, newSale.saleLocation, saleLocations);
  // salePrice is TOTAL price for the lot (not per-unit)
  const totalRevenue = newSale.salePrice;
  const totalCost = newSale.fee + newSale.shippingFee + newSale.otherCost;
  const netRevenue = totalRevenue - totalCost;
  const profit = selectedProduct ? netRevenue - (Number(selectedProduct.buyPrice) * newSale.quantity) : 0;

  const dateFilteredSales = useMemo(() => filterSalesByDateRange(sales || [], fromDate || undefined, toDate || undefined), [sales, fromDate, toDate]);

  // Sort sales after applying the compact date filter.
  const sortedSales = useMemo(() => {
    if (dateFilteredSales.length === 0) return [];
    const sorted = [...dateFilteredSales].sort((a: any, b: any) => {
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
  }, [dateFilteredSales, sortField, sortDirection]);

  const totals = useMemo(() => summarizeSales(sortedSales), [sortedSales]);
  const hasDateFilter = Boolean(fromDate || toDate);
  const resetDateFilter = () => { setFromDate(""); setToDate(""); setQuickPeriod(null); };
  const applyQuickPeriod = (period: SaleQuickPeriod) => {
    const range = getQuickSaleDateRange(period);
    setFromDate(range.fromDate);
    setToDate(range.toDate);
    setQuickPeriod(period);
  };
  const formatFilterDate = (value: string) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("vi-VN") : "…";

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
              <span className="rgb-action-label">Tạo giao dịch bán</span>
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
                        {p.name} ({p.type}) · SL: {p.quantity} · {formatYen(Number(p.buyPrice))}/SP{p.damagedQuantity > 0 ? ` (${p.damagedQuantity} hỏng)` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedProduct && (
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>Lô đang chọn: {selectedProduct.quantity} × {formatYen(Number(selectedProduct.buyPrice))}/SP · Tổng vốn {formatYen(Number(selectedProduct.buyPrice) * Number(selectedProduct.quantity || 0))}</p>
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
                {recentSaleLocations.length > 0 && <div className="flex flex-wrap gap-1.5"><span className="w-full text-xs text-muted-foreground">Dùng gần đây</span>{recentSaleLocations.map((location) => <Button key={`recent-${location.platform}-${location.saleLocation || ""}`} type="button" size="sm" variant="outline" className="h-7 border-sky-400/40 px-2 text-xs text-sky-100 hover:bg-sky-500/15" onClick={() => { setIsAddingSaleLocation(false); setNewSale((current) => ({ ...current, platform: location.platform, saleLocation: location.saleLocation })); }}>{location.saleLocation || PLATFORMS.find((platform) => platform.value === location.platform)?.label || location.name}</Button>)}</div>}
                <Select value={saleLocationValue} onValueChange={(v) => {
                  if (v === ADD_SALE_LOCATION_VALUE) {
                    setIsAddingSaleLocation(true);
                    setNewSale((current) => ({ ...current, platform: "other", saleLocation: null }));
                    return;
                  }
                  setIsAddingSaleLocation(false);
                  setNewSale((current) => ({ ...current, ...resolveSaleLocationSelection(v, saleLocations) }));
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map(pl => (
                      <SelectItem key={pl.value} value={`platform:${pl.value}`}>{pl.label}</SelectItem>
                    ))}
                    {saleLocations.length > 0 && <div className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">Nơi bán của bạn</div>}
                    {saleLocations.map((location: any) => <SelectItem key={location.id} value={`location:${location.id}`}>{location.name}{location.useCount ? ` · ${location.useCount} lần` : ""}</SelectItem>)}
                    <SelectItem value={ADD_SALE_LOCATION_VALUE}>+ Thêm nơi bán</SelectItem>
                  </SelectContent>
                </Select>
                {isAddingSaleLocation && <div className="flex gap-2"><Input value={customSaleLocationName} onChange={(event) => setCustomSaleLocationName(event.target.value)} placeholder="Nhập tên nơi bán..." /><Button type="button" variant="outline" className="shrink-0" disabled={!customSaleLocationName.trim() || saveSaleLocation.isPending} onClick={() => saveSaleLocation.mutate({ name: customSaleLocationName.trim() })}>{saveSaleLocation.isPending ? "Đang lưu..." : "Lưu & chọn"}</Button></div>}
                {saleLocations.length > 0 && <div className="space-y-1 rounded-md border border-amber-400/30 bg-amber-500/5 p-2"><p className="text-xs font-medium text-muted-foreground">Ghim & tần suất nơi bán</p>{saleLocations.map((location: any) => <div key={`pin-${location.id}`} className="flex items-center gap-1"><span className="min-w-0 flex-1 truncate text-xs">{location.name} <span className="text-muted-foreground">· {location.useCount || 0} lần</span></span><Button type="button" size="icon" variant="ghost" className={`h-7 w-7 ${location.isPinned ? "text-amber-300 hover:text-amber-200" : "text-muted-foreground hover:text-amber-200"}`} aria-label={`${location.isPinned ? "Bỏ ghim" : "Ghim"} ${location.name}`} disabled={setSavedSaleLocationPinned.isPending} onClick={() => setSavedSaleLocationPinned.mutate({ id: location.id, isPinned: !Boolean(location.isPinned) })}><Pin className={`h-3.5 w-3.5 ${location.isPinned ? "fill-current" : ""}`} /></Button></div>)}</div>}
                {saleLocations.length > 0 && <div className="space-y-1 rounded-md border border-border bg-background/40 p-2"><p className="text-xs font-medium text-muted-foreground">Nơi bán tự thêm</p>{saleLocations.map((location: any) => editingSaleLocation?.id === location.id ? <div key={location.id} className="flex gap-1"><Input className="h-8" value={editingSaleLocation?.name ?? ""} onChange={(event) => setEditingSaleLocation((current) => current ? { ...current, name: event.target.value } : current)} /><Button type="button" size="sm" className="h-8" disabled={!(editingSaleLocation?.name ?? "").trim() || updateSavedSaleLocation.isPending} onClick={() => updateSavedSaleLocation.mutate({ id: location.id, name: (editingSaleLocation?.name ?? "").trim() })}>Lưu</Button><Button type="button" size="sm" variant="ghost" className="h-8" onClick={() => setEditingSaleLocation(null)}>Hủy</Button></div> : <div key={location.id} className="flex items-center gap-1"><Button type="button" size="sm" variant="ghost" className="h-7 flex-1 justify-start px-1.5" onClick={() => { setIsAddingSaleLocation(false); setNewSale((current) => ({ ...current, platform: "other", saleLocation: location.name })); }}>{location.name}</Button><Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label={`Sửa ${location.name}`} onClick={() => setEditingSaleLocation({ id: location.id, name: location.name })}><Pencil className="h-3.5 w-3.5" /></Button><Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-red-300 hover:text-red-200" aria-label={`Xóa ${location.name}`} onClick={() => setDeleteSaleLocationId(location.id)}><Trash2 className="h-3.5 w-3.5" /></Button></div>)}</div>}
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
                  <p className="text-xs text-muted-foreground">Giá bán/SP: {formatYen(Math.round(newSale.salePrice / newSale.quantity))}</p>
                )}
                <p className="text-sm text-muted-foreground">Doanh thu: <span className="font-medium text-foreground">{formatYen(totalRevenue)}</span></p>
                <p className="text-sm text-muted-foreground">Phí: <span className="font-medium text-foreground">{formatYen(-totalCost)}</span></p>
                <p className="text-sm text-muted-foreground">Thực nhận: <span className="font-medium text-foreground">{formatYen(netRevenue)}</span></p>
                {selectedProduct && (
                  <p className="text-sm text-muted-foreground">Giá vốn: <span className="font-medium text-foreground">{formatYen(-(Number(selectedProduct.buyPrice) * newSale.quantity))}</span></p>
                )}
                <p className={`text-sm font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  Lợi nhuận: {formatSignedYen(profit)}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Ghi chú</Label>
                <Textarea value={newSale.note} onChange={(e) => setNewSale(p => ({ ...p, note: e.target.value }))} placeholder="VD: Bán cho khách quen..." />
              </div>
              <Button
                className="w-full"
                onClick={() => createSale.mutate(newSale)}
                disabled={!newSale.productId || !newSale.salePrice || isAddingSaleLocation || createSale.isPending}
              >
                {createSale.isPending ? "Đang lưu..." : "Lưu giao dịch bán"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <AlertDialog open={deleteSaleLocationId !== null} onOpenChange={(open) => !open && setDeleteSaleLocationId(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xóa nơi bán tự thêm?</AlertDialogTitle><AlertDialogDescription>Nơi bán sẽ bị bỏ khỏi gợi ý. Lịch sử giao dịch bán cũ không bị thay đổi.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Hủy</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700" disabled={deleteSavedSaleLocation.isPending} onClick={() => deleteSaleLocationId && deleteSavedSaleLocation.mutate({ id: deleteSaleLocationId })}>Xóa nơi bán</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      </div>

      {/* Compact filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-3 shadow-sm">
        <div className="flex flex-wrap items-end justify-center gap-2 sm:justify-start">
          <div className="w-[124px] sm:w-[170px]"><Label htmlFor="sales-from-date" className="mb-1 block text-[11px] text-muted-foreground">Từ ngày</Label><div className="relative"><Input id="sales-from-date" type="date" value={fromDate} max={toDate || undefined} onChange={(event) => { setFromDate(event.target.value); setQuickPeriod(null); }} className={`sales-date-input h-8 px-2 text-xs ${fromDate ? "" : "text-transparent"}`} aria-label="Từ ngày" /><span aria-hidden="true" className={`pointer-events-none absolute inset-y-0 left-2 flex items-center text-xs text-muted-foreground ${fromDate ? "hidden" : ""}`}>Chọn ngày</span></div></div>
          <div className="w-[124px] sm:w-[170px]"><Label htmlFor="sales-to-date" className="mb-1 block text-[11px] text-muted-foreground">Đến ngày</Label><div className="relative"><Input id="sales-to-date" type="date" value={toDate} min={fromDate || undefined} onChange={(event) => { setToDate(event.target.value); setQuickPeriod(null); }} className={`sales-date-input h-8 px-2 text-xs ${toDate ? "" : "text-transparent"}`} aria-label="Đến ngày" /><span aria-hidden="true" className={`pointer-events-none absolute inset-y-0 left-2 flex items-center text-xs text-muted-foreground ${toDate ? "hidden" : ""}`}>Chọn ngày</span></div></div>
          <div className="flex w-full justify-center gap-1.5 sm:w-auto sm:justify-start">{([['today', 'Hôm nay'], ['week', 'Tuần này'], ['month', 'Tháng này']] as const).map(([period, label]) => <Button key={period} type="button" variant={quickPeriod === period ? "secondary" : "ghost"} size="sm" className={`h-8 px-2 text-[11px] ${quickPeriod === period ? "bg-primary/15 text-primary hover:bg-primary/20" : "text-muted-foreground hover:text-foreground"}`} onClick={() => applyQuickPeriod(period)}>{label}</Button>)}</div>
          {hasDateFilter && <Button type="button" variant="ghost" size="sm" className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={resetDateFilter}><X className="mr-1 h-3.5 w-3.5" />Xóa ngày</Button>}
          <div className="flex items-center rounded-md bg-muted/60 px-2.5 py-2 text-xs text-muted-foreground sm:ml-auto">{hasDateFilter ? `${formatFilterDate(fromDate)} — ${formatFilterDate(toDate)}` : "Tất cả thời gian"}</div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
                        {sale.saleLocation || PLATFORMS.find(p => p.value === sale.platform)?.label || sale.platform}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">Đã bán {sale.quantity} cái · {formatYen(sale.quantity > 0 ? Math.round(Number(sale.totalRevenue) / sale.quantity) : 0)} / cái</p>
                    </div>
                 </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="whitespace-nowrap font-bold text-sm">{formatYen(Number(sale.totalRevenue))}</p>
                      <p className={`whitespace-nowrap text-xs font-medium ${Number(sale.profit) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatSignedYen(Number(sale.profit))}
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
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-primary">Tổng kết</p>
                    <p className="text-xs text-muted-foreground">
                      {totals.transactionCount} giao dịch trong khoảng đang xem
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-5 gap-y-2 text-right sm:grid-cols-4">
                  <div><p className="font-bold text-base text-primary">{totals.totalQuantity}</p><p className="text-[11px] text-muted-foreground">Số lượng đã bán</p></div>
                  <div><p className="font-bold text-base text-primary">{formatYen(totals.totalRevenue)}</p><p className="text-[11px] text-muted-foreground">Tổng doanh thu</p></div>
                  <div><p className="font-bold text-base text-amber-400">{formatYen(totals.totalCostBasis)}</p><p className="text-[11px] text-muted-foreground">Giá vốn đã mua</p></div>
                  <div><p className={`font-bold text-sm ${totals.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatSignedYen(totals.totalProfit)}</p><p className="text-[11px] text-muted-foreground">Lợi nhuận</p></div>
                </div>
              </div>
              <div className="mt-4 border-t border-border pt-3"><p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Chi tiết sản phẩm đã bán</p><div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">{totals.products.map((product) => <div key={product.key} className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-2.5 py-2 text-xs"><div className="min-w-0"><p className="truncate font-semibold text-foreground">{product.productName}</p><p className="mt-0.5 text-muted-foreground">{product.transactionCount} giao dịch · {product.quantity} cái</p><p className="mt-0.5 text-amber-400">Giá vốn: {formatYen(product.totalCostBasis)} · {formatYen(product.averageUnitCost)} / cái</p></div><div className="shrink-0 text-right"><p className="font-semibold text-foreground">{formatYen(product.totalRevenue)}</p><p className="mt-0.5 text-muted-foreground">Bán: {formatYen(product.averageUnitPrice)} / cái</p></div></div>)}</div></div>
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
                  Giá bán/SP: {formatYen(Math.round(editForm.salePrice / editForm.quantity))}
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
                  Giao dịch bán <strong>{selectedSale.productName}</strong> ({selectedSale.quantity} SP - {formatYen(Number(selectedSale.totalRevenue))}) sẽ bị xóa. Số lượng sẽ được hoàn lại vào kho.
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
