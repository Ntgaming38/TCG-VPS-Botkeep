import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Plus, Search, ShoppingCart, Calendar, ArrowUpDown, ArrowUp, ArrowDown, Pencil, Pin, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CHYUSEN_PURCHASE_DRAFT_STORAGE_KEY, getChyusenEntryIdToMarkAfterPurchase, parseChyusenPurchaseDraft } from "@shared/chyusenPurchaseDraft";
import { formatYen } from "@shared/formatYen";
import { productTypeLabel, type ProductType } from "@shared/productCreateType";
import { ProductTypeBadge } from "@/components/ProductTypeBadge";
import { ProductNameSuggestions } from "@/components/ProductNameSuggestions";

const DEFAULT_SHOPS = ["Geo", "Joshin", "Fruichi", "COMG!", "Toysrus", "Lawson", "Seven Eleven", "Family Mart"];
const ADD_PURCHASE_SHOP_VALUE = "__add_purchase_shop";

type SortField = "date" | "price" | "name";
type SortDirection = "asc" | "desc";

export default function Purchases() {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
  const [editForm, setEditForm] = useState({ quantity: 1, price: 0, shop: "", note: "" });
  const [newPurchase, setNewPurchase] = useState({
    productName: "", productType: "box" as ProductType,
    series: "Pokemon", shop: "Joshin", purchaseType: "mua_le" as any,
    quantity: 1, price: 0, note: "",
  });
  const [pendingChyusenEntryId, setPendingChyusenEntryId] = useState<number | null>(null);
  const [customPurchaseShopName, setCustomPurchaseShopName] = useState("");
  const [editingSavedShop, setEditingSavedShop] = useState<{ id: number; name: string } | null>(null);
  const [deleteSavedShopId, setDeleteSavedShopId] = useState<number | null>(null);
  const [selectedExistingProduct, setSelectedExistingProduct] = useState<{ name: string; type: ProductType; quantity?: number | null; buyPrice?: number | string | null } | null>(null);

  const utils = trpc.useUtils();
  const { data: purchases, refetch } = trpc.purchases.list.useQuery({ search: search || undefined });
  const { data: savedShops = [] } = trpc.shops.list.useQuery();
  const { data: recentPurchaseShops = [] } = trpc.shops.recent.useQuery();

  const invalidateAll = () => {
    utils.purchases.list.invalidate();
    utils.products.list.invalidate();
    utils.products.inStock.invalidate();
    utils.sales.list.invalidate();
    utils.dashboard.stats.invalidate();
    utils.reports.overview.invalidate();
  };

  const markChyusenPurchaseCreated = trpc.chyusen.markPurchaseCreated.useMutation({
    onSuccess: () => {
      setPendingChyusenEntryId(null);
      utils.chyusen.list.invalidate();
      utils.trash.list.invalidate();
      utils.dashboard.stats.invalidate();
      toast.success("Chyusen đã hoàn tất mua và được chuyển vào Thùng rác.");
    },
    onError: (error) => toast.error(error.message),
  });

  const savePurchaseShop = trpc.shops.create.useMutation({
    onSuccess: (_result, variables) => {
      const name = variables.name.trim();
      setNewPurchase((current) => ({ ...current, shop: name }));
      setCustomPurchaseShopName("");
      utils.shops.list.invalidate();
      toast.success(`Đã lưu cửa hàng ${name}.`);
    },
    onError: (error) => toast.error(error.message),
  });
  const updateSavedPurchaseShop = trpc.shops.update.useMutation({
    onSuccess: (data) => { setNewPurchase((current) => current.shop === editingSavedShop?.name ? { ...current, shop: data.name } : current); setEditingSavedShop(null); utils.shops.list.invalidate(); utils.shops.recent.invalidate(); toast.success("Đã cập nhật cửa hàng."); },
    onError: (error) => toast.error(error.message),
  });
  const deleteSavedPurchaseShop = trpc.shops.delete.useMutation({
    onSuccess: () => { setDeleteSavedShopId(null); utils.shops.list.invalidate(); utils.shops.recent.invalidate(); toast.success("Đã xóa cửa hàng khỏi gợi ý."); },
    onError: (error) => toast.error(error.message),
  });
  const setSavedPurchaseShopPinned = trpc.shops.setPinned.useMutation({
    onSuccess: (data) => { utils.shops.list.invalidate(); toast.success(data.isPinned ? "Đã ghim cửa hàng lên đầu gợi ý." : "Đã bỏ ghim cửa hàng."); },
    onError: (error) => toast.error(error.message),
  });

  useEffect(() => {
    const rawDraft = localStorage.getItem(CHYUSEN_PURCHASE_DRAFT_STORAGE_KEY);
    const draft = parseChyusenPurchaseDraft(rawDraft);
    if (draft) {
      setNewPurchase(draft.purchase);
      setPendingChyusenEntryId(draft.chyusenEntryId);
      setShowAddDialog(true);
    }
    if (rawDraft) localStorage.removeItem(CHYUSEN_PURCHASE_DRAFT_STORAGE_KEY);
  }, []);

  const createPurchase = trpc.purchases.create.useMutation({
    onSuccess: () => {
      toast.success("Đã thêm giao dịch mua thành công!");
      const chyusenEntryId = getChyusenEntryIdToMarkAfterPurchase(pendingChyusenEntryId);
      if (chyusenEntryId) markChyusenPurchaseCreated.mutate({ id: chyusenEntryId });
      setShowAddDialog(false);
      setNewPurchase({ productName: "", productType: "box", series: "Pokemon", shop: "Joshin", purchaseType: "mua_le", quantity: 1, price: 0, note: "" });
      setSelectedExistingProduct(null);
      invalidateAll();
    },
    onError: (err) => toast.error(err.message),
  });

  const updatePurchase = trpc.purchases.update.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật giao dịch mua!");
      setShowEditDialog(false);
      setSelectedPurchase(null);
      invalidateAll();
    },
    onError: (err) => toast.error(err.message),
  });

  const deletePurchase = trpc.purchases.delete.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa giao dịch mua!");
      setShowDeleteConfirm(false);
      setSelectedPurchase(null);
      invalidateAll();
    },
    onError: (err) => toast.error(err.message),
  });

  // Sort purchases
  const sortedPurchases = useMemo(() => {
    if (!purchases || purchases.length === 0) return [];
    const sorted = [...purchases].sort((a: any, b: any) => {
      let cmp = 0;
      switch (sortField) {
        case "date":
          cmp = new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime();
          break;
        case "price":
          cmp = Number(a.totalPrice) - Number(b.totalPrice);
          break;
        case "name":
          cmp = (a.productName || "").localeCompare(b.productName || "", "vi");
          break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [purchases, sortField, sortDirection]);

  const purchaseShopOptions = useMemo(() => {
    const seen = new Set<string>();
    return [...savedShops.map((shop: any) => shop.name), ...DEFAULT_SHOPS].filter((name) => {
      const key = String(name).trim().toLocaleLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [savedShops]);

  const savedPurchaseShopByName = useMemo(() => new Map(savedShops.map((shop: any) => [shop.name.trim().toLocaleLowerCase(), shop])), [savedShops]);

  const selectedPurchaseUnitPrice = newPurchase.quantity > 0 ? Math.round(Number(newPurchase.price || 0) / newPurchase.quantity) : 0;
  const selectedPriceMatches = Boolean(selectedExistingProduct) && selectedPurchaseUnitPrice === Math.round(Number(selectedExistingProduct?.buyPrice || 0));
  const projectedMergedQuantity = Number(selectedExistingProduct?.quantity || 0) + Number(newPurchase.quantity || 0);

  // Calculate totals for current list
  const totals = useMemo(() => {
    const totalAmount = sortedPurchases.reduce((sum, p: any) => sum + Number(p.totalPrice || 0), 0);
    const totalQuantity = sortedPurchases.reduce((sum, p: any) => sum + (p.quantity || 0), 0);
    return { totalAmount, totalQuantity, count: sortedPurchases.length };
  }, [sortedPurchases]);

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

  const handleEditClick = (purchase: any) => {
    setSelectedPurchase(purchase);
    setEditForm({
      quantity: purchase.quantity,
      price: Number(purchase.totalPrice),
      shop: purchase.shop || "",
      note: purchase.note || "",
    });
    setShowEditDialog(true);
  };

  const handleDeleteClick = (purchase: any) => {
    setSelectedPurchase(purchase);
    setShowDeleteConfirm(true);
  };

  const handleEditSubmit = () => {
    if (!selectedPurchase) return;
    updatePurchase.mutate({
      purchaseId: selectedPurchase.id,
      quantity: editForm.quantity,
      price: editForm.price,
      shop: editForm.shop,
      note: editForm.note,
    });
  };

  const handleDeleteConfirm = () => {
    if (!selectedPurchase) return;
    deletePurchase.mutate({ purchaseId: selectedPurchase.id });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mua Hàng</h1>
          <p className="text-muted-foreground text-sm mt-1">Quản lý lịch sử mua hàng</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              <span className="rgb-action-label">Thêm mua hàng</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Thêm giao dịch mua</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Loại sản phẩm</Label>
                  <Select value={newPurchase.productType} onValueChange={(v) => { setSelectedExistingProduct(null); setNewPurchase(p => ({ ...p, productType: v as any })); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="box">Box</SelectItem>
                      <SelectItem value="pack">Pack</SelectItem>
                      <SelectItem value="junk_pack">Pack Rác</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Hình thức</Label>
                  <Select value={newPurchase.purchaseType} onValueChange={(v) => setNewPurchase(p => ({ ...p, purchaseType: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mua_le">Mua lẻ</SelectItem>
                      <SelectItem value="coc_5">Cọc 5</SelectItem>
                      <SelectItem value="coc_10">Cọc 10</SelectItem>
                      <SelectItem value="coc_30">Cọc 30</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="relative z-20 space-y-2">
                <Label>Tên sản phẩm</Label>
                <Input
                  value={newPurchase.productName}
                  onChange={(e) => { setSelectedExistingProduct(null); setNewPurchase(p => ({ ...p, productName: e.target.value })); }}
                  placeholder="Nhập tên sản phẩm..."
                  autoComplete="off"
                />
                <ProductNameSuggestions className="relative z-30" search={newPurchase.productName} onSelect={(product) => { setSelectedExistingProduct(product); setNewPurchase((current) => ({ ...current, productName: product.name, productType: product.type, series: product.series || "Pokemon", price: Number(product.buyPrice || 0) * current.quantity })); }} />
                {selectedExistingProduct && (selectedPriceMatches ? <div className="flex items-start gap-2 rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100" role="status"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /><span><strong>Sẽ gộp vào số lượng hiện có</strong><br /><span className="text-emerald-200/80">{selectedExistingProduct.name} · đang có {selectedExistingProduct.quantity || 0} {productTypeLabel(selectedExistingProduct.type)} · {formatYen(Number(selectedExistingProduct.buyPrice || 0))}/SP</span><br /><span className="font-semibold text-emerald-100">Tổng số lượng dự kiến sau khi gộp: {projectedMergedQuantity} {productTypeLabel(selectedExistingProduct.type)}</span></span></div> : <div className="flex items-start gap-2 rounded-md border border-red-400/50 bg-red-500/10 px-3 py-2 text-xs text-red-100" role="alert"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" /><span><strong>Không thể gộp</strong><br /><span className="text-red-200/90">Giá nhập mới {formatYen(selectedPurchaseUnitPrice)}/SP khác giá mua hiện tại {formatYen(Number(selectedExistingProduct.buyPrice || 0))}/SP.</span></span></div>)}
              </div>
              <div className="space-y-2">
                <Label>Shop mua</Label>
                {recentPurchaseShops.length > 0 && <div className="flex flex-wrap gap-1.5"><span className="w-full text-xs text-muted-foreground">Dùng gần đây</span>{recentPurchaseShops.map((shop) => <Button key={`recent-${shop.name}`} type="button" size="sm" variant="outline" className="h-7 border-sky-400/40 px-2 text-xs text-sky-100 hover:bg-sky-500/15" onClick={() => setNewPurchase((current) => ({ ...current, shop: shop.name }))}>{shop.name}</Button>)}</div>}
                <Select value={newPurchase.shop} onValueChange={(v) => setNewPurchase(p => ({ ...p, shop: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {purchaseShopOptions.map(shop => (
                      <SelectItem key={shop} value={shop}>{shop}{savedPurchaseShopByName.get(shop.trim().toLocaleLowerCase())?.useCount ? ` · ${savedPurchaseShopByName.get(shop.trim().toLocaleLowerCase()).useCount} lần` : ""}</SelectItem>
                    ))}
                    <SelectItem value={ADD_PURCHASE_SHOP_VALUE}>+ Thêm cửa hàng</SelectItem>
                  </SelectContent>
                </Select>
                {newPurchase.shop === ADD_PURCHASE_SHOP_VALUE && <div className="flex gap-2"><Input value={customPurchaseShopName} onChange={(event) => setCustomPurchaseShopName(event.target.value)} placeholder="Nhập tên cửa hàng..." /><Button type="button" variant="outline" className="shrink-0" disabled={!customPurchaseShopName.trim() || savePurchaseShop.isPending} onClick={() => savePurchaseShop.mutate({ name: customPurchaseShopName.trim() })}>{savePurchaseShop.isPending ? "Đang lưu..." : "Lưu & chọn"}</Button></div>}
                {savedShops.length > 0 && <div className="space-y-1 rounded-md border border-amber-400/30 bg-amber-500/5 p-2"><p className="text-xs font-medium text-muted-foreground">Ghim & tần suất cửa hàng</p>{savedShops.map((shop: any) => <div key={`pin-${shop.id}`} className="flex items-center gap-1"><span className="min-w-0 flex-1 truncate text-xs">{shop.name} <span className="text-muted-foreground">· {shop.useCount || 0} lần</span></span><Button type="button" size="icon" variant="ghost" className={`h-7 w-7 ${shop.isPinned ? "text-amber-300 hover:text-amber-200" : "text-muted-foreground hover:text-amber-200"}`} aria-label={`${shop.isPinned ? "Bỏ ghim" : "Ghim"} ${shop.name}`} disabled={setSavedPurchaseShopPinned.isPending} onClick={() => setSavedPurchaseShopPinned.mutate({ id: shop.id, isPinned: !Boolean(shop.isPinned) })}><Pin className={`h-3.5 w-3.5 ${shop.isPinned ? "fill-current" : ""}`} /></Button></div>)}</div>}
                {savedShops.length > 0 && <div className="space-y-1 rounded-md border border-border bg-background/40 p-2"><p className="text-xs font-medium text-muted-foreground">Cửa hàng tự thêm</p>{savedShops.map((shop: any) => editingSavedShop?.id === shop.id ? <div key={shop.id} className="flex gap-1"><Input className="h-8" value={editingSavedShop?.name ?? ""} onChange={(event) => setEditingSavedShop((current) => current ? { ...current, name: event.target.value } : current)} /><Button type="button" size="sm" className="h-8" disabled={!(editingSavedShop?.name ?? "").trim() || updateSavedPurchaseShop.isPending} onClick={() => updateSavedPurchaseShop.mutate({ id: shop.id, name: (editingSavedShop?.name ?? "").trim() })}>Lưu</Button><Button type="button" size="sm" variant="ghost" className="h-8" onClick={() => setEditingSavedShop(null)}>Hủy</Button></div> : <div key={shop.id} className="flex items-center gap-1"><Button type="button" size="sm" variant="ghost" className="h-7 flex-1 justify-start px-1.5" onClick={() => setNewPurchase((current) => ({ ...current, shop: shop.name }))}>{shop.name}</Button><Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label={`Sửa ${shop.name}`} onClick={() => setEditingSavedShop({ id: shop.id, name: shop.name })}><Pencil className="h-3.5 w-3.5" /></Button><Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-red-300 hover:text-red-200" aria-label={`Xóa ${shop.name}`} onClick={() => setDeleteSavedShopId(shop.id)}><Trash2 className="h-3.5 w-3.5" /></Button></div>)}</div>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Số lượng</Label>
                  <Input type="number" min={1} value={newPurchase.quantity} onChange={(e) => setNewPurchase(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))} />
                </div>
                <div className="space-y-2">
                  <Label>Tổng giá mua (¥)</Label>
                  <Input type="number" min={0} value={newPurchase.price} onChange={(e) => setNewPurchase(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Tổng tiền: <span className="font-bold text-foreground">{formatYen(newPurchase.price)}</span></p>
                {newPurchase.quantity > 0 && newPurchase.price > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">Giá vốn/SP: <span className="font-medium text-foreground">{formatYen(Math.round(newPurchase.price / newPurchase.quantity))}</span></p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Ghi chú</Label>
                <Textarea value={newPurchase.note} onChange={(e) => setNewPurchase(p => ({ ...p, note: e.target.value }))} placeholder="VD: Mua tại Joshin Nagaoka..." />
              </div>
              <Button
                className="w-full"
                onClick={() => createPurchase.mutate(newPurchase)}
                disabled={!newPurchase.productName || !newPurchase.price || newPurchase.shop === ADD_PURCHASE_SHOP_VALUE || createPurchase.isPending}
              >
                {createPurchase.isPending ? "Đang lưu..." : "Lưu giao dịch"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <AlertDialog open={deleteSavedShopId !== null} onOpenChange={(open) => !open && setDeleteSavedShopId(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xóa cửa hàng tự thêm?</AlertDialogTitle><AlertDialogDescription>Cửa hàng sẽ bị bỏ khỏi gợi ý. Lịch sử mua hàng cũ không bị thay đổi.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Hủy</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700" disabled={deleteSavedPurchaseShop.isPending} onClick={() => deleteSavedShopId && deleteSavedPurchaseShop.mutate({ id: deleteSavedShopId })}>Xóa cửa hàng</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm kiếm giao dịch..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground mr-1">Sắp xếp:</span>
          <Button variant={sortField === "date" ? "secondary" : "ghost"} size="sm" className="h-8 px-2.5 text-xs gap-1" onClick={() => toggleSort("date")}>
            Ngày <SortIcon field="date" />
          </Button>
          <Button variant={sortField === "price" ? "secondary" : "ghost"} size="sm" className="h-8 px-2.5 text-xs gap-1" onClick={() => toggleSort("price")}>
            Giá <SortIcon field="price" />
          </Button>
          <Button variant={sortField === "name" ? "secondary" : "ghost"} size="sm" className="h-8 px-2.5 text-xs gap-1" onClick={() => toggleSort("name")}>
            Tên <SortIcon field="name" />
          </Button>
        </div>
      </div>

      {/* Purchase List */}
      {sortedPurchases.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-medium text-muted-foreground">Chưa có giao dịch mua nào</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">Bấm "Thêm mua hàng" để bắt đầu</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedPurchases.map((purchase: any) => (
            <Card key={purchase.id} className="bg-card neon-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <ShoppingCart className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="flex flex-wrap items-center gap-1.5 font-medium text-sm"><span>{purchase.productName || 'Sản phẩm'}</span>{purchase.productType && <ProductTypeBadge type={purchase.productType} compact />}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {new Date(purchase.purchaseDate).toLocaleDateString('vi-VN')}
                        <span>•</span>
                        {purchase.shop}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-sm">{formatYen(Number(purchase.totalPrice))}</p>
                      <p className="text-xs text-muted-foreground">{purchase.quantity} x {formatYen(Number(purchase.price))}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-blue-400" onClick={() => handleEditClick(purchase)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400" onClick={() => handleDeleteClick(purchase)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                {purchase.note && (
                  <p className="text-xs text-muted-foreground mt-2 pl-13 italic">📝 {purchase.note}</p>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Total Summary */}
          <Card className="bg-card border-primary/30 border-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-primary">Tổng kết</p>
                    <p className="text-xs text-muted-foreground">
                      {totals.count} giao dịch • {totals.totalQuantity} sản phẩm
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-primary">{formatYen(totals.totalAmount)}</p>
                  <p className="text-xs text-muted-foreground">Tổng tiền mua</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Purchase Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>✏️ Sửa giao dịch mua</DialogTitle>
          </DialogHeader>
          {selectedPurchase && (
            <div className="space-y-4 mt-4">
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-sm font-medium">{selectedPurchase.productName}</p>
                <p className="text-xs text-muted-foreground">Ngày: {new Date(selectedPurchase.purchaseDate).toLocaleDateString('vi-VN')} (không thể sửa)</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Số lượng</Label>
                  <Input type="number" min={1} value={editForm.quantity} onChange={(e) => setEditForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))} />
                </div>
                <div className="space-y-2">
                  <Label>Tổng giá mua (¥)</Label>
                  <Input type="number" min={0} value={editForm.price} onChange={(e) => setEditForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>
              {editForm.quantity > 0 && editForm.price > 0 && (
                <div className="p-2 bg-secondary/30 rounded text-xs text-muted-foreground">
                  Giá vốn/SP: {formatYen(Math.round(editForm.price / editForm.quantity))}
                </div>
              )}
              <div className="space-y-2">
                <Label>Shop mua</Label>
                <Select value={editForm.shop} onValueChange={(v) => setEditForm(f => ({ ...f, shop: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEFAULT_SHOPS.map(shop => (
                      <SelectItem key={shop} value={shop}>{shop}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ghi chú</Label>
                <Textarea value={editForm.note} onChange={(e) => setEditForm(f => ({ ...f, note: e.target.value }))} />
              </div>
              <Button className="w-full" onClick={handleEditSubmit} disabled={updatePurchase.isPending}>
                {updatePurchase.isPending ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>🗑 Bạn có chắc muốn xóa sản phẩm này?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedPurchase && (
                <span>
                  Giao dịch mua <strong>{selectedPurchase.productName}</strong> ({selectedPurchase.quantity} SP - {formatYen(Number(selectedPurchase.totalPrice))}) sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
              disabled={deletePurchase.isPending}
            >
              {deletePurchase.isPending ? "Đang xóa..." : "Xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
