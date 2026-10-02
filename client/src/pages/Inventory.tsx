import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { RarityBadge } from "@/components/RarityBadge";
import { getInventoryEmptyState, INVENTORY_HIDDEN_STATUS, isInventoryHiddenFilter } from "@shared/inventoryHiddenFilter";
import { formatYen } from "@shared/formatYen";
import { Search, Package, Warehouse, AlertTriangle, Pencil, Trash2, EyeOff } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { sortProductsByRecentPurchase } from "@shared/productRecentOrder";
import { productTypeLabel } from "@shared/productCreateType";
import { ProductTypeBadge } from "@/components/ProductTypeBadge";

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDamageDialog, setShowDamageDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [damageQty, setDamageQty] = useState(1);
  const [damageNote, setDamageNote] = useState("");
  const [editForm, setEditForm] = useState({ name: "", series: "", quantity: 0, buyPrice: 0, marketPrice: 0 });

  const utils = trpc.useUtils();

  const invalidateAll = () => {
    utils.products.list.invalidate();
    utils.products.inStock.invalidate();
    utils.dashboard.stats.invalidate();
    utils.reports.overview.invalidate();
    utils.purchases.list.invalidate();
    utils.sales.list.invalidate();
  };

  const { data: products } = trpc.products.list.useQuery({
    type: typeFilter !== "all" ? typeFilter : undefined,
    status: statusFilter === "all" ? "all" : statusFilter,
    search: search || undefined,
  });
  const { data: soldProducts } = trpc.products.list.useQuery({ status: INVENTORY_HIDDEN_STATUS });

  const markDamaged = trpc.products.markDamaged.useMutation({
    onSuccess: () => {
      toast.success("Đã đánh dấu sản phẩm bị hỏng!");
      setShowDamageDialog(false);
      setSelectedProduct(null);
      setDamageQty(1);
      setDamageNote("");
      invalidateAll();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateProduct = trpc.products.update.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật sản phẩm!");
      setShowEditDialog(false);
      setSelectedProduct(null);
      invalidateAll();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteProduct = trpc.products.delete.useMutation({
    onSuccess: () => {
      toast.success("Đã xoá sản phẩm!");
      setShowDeleteDialog(false);
      setSelectedProduct(null);
      invalidateAll();
    },
    onError: (err) => toast.error(err.message),
  });

  const totalItems = products?.reduce((sum: number, p: any) => sum + p.quantity, 0) ?? 0;
  const totalDamaged = products?.reduce((sum: number, p: any) => sum + (p.damagedQuantity || 0), 0) ?? 0;
  const totalValue = products?.reduce((sum: number, p: any) => sum + (Number(p.marketPrice || p.buyPrice || 0) * (p.quantity - (p.damagedQuantity || 0))), 0) ?? 0;
  const soldProductCount = soldProducts?.length ?? 0;
  const emptyState = getInventoryEmptyState(statusFilter);
  const displayedProducts = useMemo(() => {
    if (!products) return [];
    return sortProductsByRecentPurchase(products);
  }, [products, statusFilter]);

  const openDamageDialog = (product: any) => {
    setSelectedProduct(product);
    setDamageQty(1);
    setDamageNote("");
    setShowDamageDialog(true);
  };

  const openEditDialog = (product: any) => {
    setSelectedProduct(product);
    setEditForm({
      name: product.name || "",
      series: product.series || "",
      quantity: product.quantity || 0,
      buyPrice: (Number(product.buyPrice) || 0) * (product.quantity || 1),
      marketPrice: (Number(product.marketPrice) || 0) * (product.quantity || 1),
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (product: any) => {
    setSelectedProduct(product);
    setShowDeleteDialog(true);
  };

  const handleMarkDamaged = () => {
    if (!selectedProduct) return;
    markDamaged.mutate({
      productId: selectedProduct.id,
      damagedQty: damageQty,
      damageNote: damageNote || undefined,
    });
  };

  const handleEdit = () => {
    if (!selectedProduct) return;
    const unitMarketPrice = editForm.quantity > 0 ? editForm.marketPrice / editForm.quantity : 0;
    updateProduct.mutate({
      id: selectedProduct.id,
      name: editForm.name,
      series: editForm.series,
      quantity: editForm.quantity,
      buyPrice: editForm.buyPrice,
      marketPrice: unitMarketPrice,
    });
  };

  const handleDelete = () => {
    if (!selectedProduct) return;
    deleteProduct.mutate({ id: selectedProduct.id });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Kho Hàng</h1>
        <p className="text-muted-foreground text-sm mt-1">Quản lý tồn kho sản phẩm</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="bg-card neon-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tổng sản phẩm</p>
              <p className="text-xl font-bold">{totalItems}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card neon-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Warehouse className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Giá trị kho (hàng tốt)</p>
              <p className="text-xl font-bold">{formatYen(totalValue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card neon-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Hàng hỏng/rác</p>
              <p className="text-xl font-bold text-red-400">{totalDamaged}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm kiếm..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Loại" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="card">Card</SelectItem>
            <SelectItem value="box">Box</SelectItem>
            <SelectItem value="pack">Pack</SelectItem>
            <SelectItem value="junk_pack">Pack Rác</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="in_stock">Trong kho</SelectItem>
            <SelectItem value={INVENTORY_HIDDEN_STATUS}>Đã bán ({soldProductCount})</SelectItem>
            <SelectItem value="reserved">Đang giữ</SelectItem>
            <SelectItem value="damaged">Hỏng/Rác</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isInventoryHiddenFilter(statusFilter) && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-100">
          <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <p>Đang xem sản phẩm đã bán hết. Hãy tạo giao dịch Mua Hàng để sản phẩm tự hiện lại trong danh sách Card, Box hoặc Pack.</p>
        </div>
      )}

      {/* Inventory Grid */}
      {displayedProducts.length === 0 ? (
        <div className="text-center py-16">
          <Warehouse className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-medium text-muted-foreground">{emptyState.title}</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">{emptyState.description}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedProducts.map((product: any) => {
            const goodQty = (product.quantity || 0) - (product.damagedQuantity || 0);
            const hasDamaged = (product.damagedQuantity || 0) > 0;
            return (
              <Card key={product.id} className={`bg-card neon-card hover:border-primary/30 transition-colors ${hasDamaged ? 'border-red-500/30' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <ProductTypeBadge type={product.type} compact />
                    <div className="flex gap-1">
                      {hasDamaged && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {product.damagedQuantity} hỏng
                        </Badge>
                      )}
                      <Badge variant={product.status === 'in_stock' ? 'default' : 'secondary'} className="text-xs">
                        {product.status === 'in_stock' ? 'Trong kho' : product.status === INVENTORY_HIDDEN_STATUS ? <><EyeOff className="mr-1 h-3 w-3" />Đã bán</> : product.status === 'damaged' ? 'Hỏng' : product.status}
                      </Badge>
                    </div>
                  </div>
	                  <div className="mt-2 flex min-w-0 items-center gap-2">
	                    <h3 className="min-w-0 flex-1 truncate font-semibold text-sm">{product.name}</h3>
	                    {product.type === "card" && product.cardNumber && <span className="rgb-card-number shrink-0 whitespace-nowrap text-xs font-semibold text-sky-300" title={`Card Number: ${product.cardNumber}`}>#{product.cardNumber}</span>}
	                    {product.type === "card" && <RarityBadge rarity={product.rarity} />}
	                  </div>
                  <p className="text-xs text-muted-foreground">{product.series}</p>
                  
                  {product.damageNote && (
                    <p className="text-xs text-red-400 mt-1 italic line-clamp-2">
                      {product.damageNote}
                    </p>
                  )}

                  <div className="mt-3 pt-3 border-t border-border/50 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Tổng SL:</span>
                      <span className="font-medium">{product.quantity}</span>
                    </div>
                    {hasDamaged && (
                      <>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Hàng tốt:</span>
                          <span className="font-medium text-green-400">{goodQty}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Hàng hỏng:</span>
                          <span className="font-medium text-red-400">{product.damagedQuantity}</span>
                        </div>
                      </>
                    )}
	                    <div className="flex justify-between text-xs">
	                      <span className="text-muted-foreground">Mua:</span>
	                      <span className="text-right font-medium">{formatYen(Number(product.buyPrice) * (product.quantity || 0))}<span className="ml-1 text-[10px] text-sky-200">({product.quantity} × {formatYen(Number(product.buyPrice))}/{productTypeLabel(product.type)})</span></span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Giá TT:</span>
                      <span className="font-medium">{formatYen(Number(product.marketPrice) * (product.quantity || 1))}</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="mt-3 pt-3 border-t border-border/50 flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                      onClick={() => openEditDialog(product)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1.5" />
                      Sửa
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={() => openDeleteDialog(product)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      Xoá
                    </Button>
                    {product.status === 'in_stock' && goodQty > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 text-xs text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10"
                        onClick={() => openDamageDialog(product)}
                      >
                        <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                        Hỏng
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Mark as Damaged Dialog */}
      <Dialog open={showDamageDialog} onOpenChange={setShowDamageDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Đánh dấu sản phẩm hỏng/rác
            </DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4 mt-2">
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="font-medium text-sm">{selectedProduct.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Loại: {selectedProduct.type} • Số lượng tốt còn lại: {(selectedProduct.quantity || 0) - (selectedProduct.damagedQuantity || 0)}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Số lượng bị hỏng</Label>
                <Input
                  type="number"
                  min={1}
                  max={(selectedProduct.quantity || 0) - (selectedProduct.damagedQuantity || 0)}
                  value={damageQty}
                  onChange={(e) => setDamageQty(parseInt(e.target.value) || 1)}
                />
              </div>

              <div className="space-y-2">
                <Label>Lý do hỏng</Label>
                <Textarea
                  value={damageNote}
                  onChange={(e) => setDamageNote(e.target.value)}
                  placeholder="VD: Rách bao bì, móp góc, ướt nước, bị trầy xước..."
                  rows={3}
                />
              </div>

              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-xs text-red-400">
                  <strong>Lưu ý:</strong> Sản phẩm hỏng vẫn nằm trong kho nhưng được tách riêng. 
                  Bạn có thể bán chúng dưới dạng "hàng rác" với giá thấp hơn.
                </p>
              </div>

              <Button
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                onClick={handleMarkDamaged}
                disabled={markDamaged.isPending}
              >
                {markDamaged.isPending ? "Đang xử lý..." : `Đánh dấu ${damageQty} sản phẩm hỏng`}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-blue-400" />
              Sửa sản phẩm
            </DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Tên sản phẩm</Label>
                <Input value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Series</Label>
                <Input value={editForm.series} onChange={(e) => setEditForm(f => ({ ...f, series: e.target.value }))} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Số lượng</Label>
                  <Input type="number" min={0} value={editForm.quantity} onChange={(e) => setEditForm(f => ({ ...f, quantity: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <Label>Tổng giá vốn (¥)</Label>
                  <Input type="number" min={0} value={editForm.buyPrice} onChange={(e) => setEditForm(f => ({ ...f, buyPrice: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <Label>Tổng giá TT (¥)</Label>
                  <Input type="number" min={0} value={editForm.marketPrice} onChange={(e) => setEditForm(f => ({ ...f, marketPrice: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>

              <div className="p-3 bg-secondary/50 rounded-lg text-xs text-muted-foreground space-y-1">
                <p>Giá vốn/SP: <span className="font-medium text-foreground">{formatYen(editForm.quantity > 0 ? editForm.buyPrice / editForm.quantity : 0)}</span></p>
                <p>Giá TT/SP: <span className="font-medium text-foreground">{formatYen(editForm.quantity > 0 ? editForm.marketPrice / editForm.quantity : 0)}</span></p>
              </div>

              <Button
                className="w-full"
                onClick={handleEdit}
                disabled={updateProduct.isPending || !editForm.name}
              >
                {updateProduct.isPending ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Product Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 className="h-5 w-5" />
              Xác nhận xoá sản phẩm
            </DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4 mt-2">
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="font-medium text-sm">{selectedProduct.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Loại: {selectedProduct.type} • Lô: {selectedProduct.quantity} × {formatYen(Number(selectedProduct.buyPrice))}/SP • Tổng vốn: {formatYen(Number(selectedProduct.buyPrice) * Number(selectedProduct.quantity || 0))}
                </p>
                <p className="text-xs text-red-400 mt-2">
                  <strong>Cảnh báo:</strong> Xoá sản phẩm sẽ xoá luôn tất cả lịch sử mua/bán liên quan. Thao tác này không thể hoàn tác.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDeleteDialog(false)}
                >
                  Huỷ
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleDelete}
                  disabled={deleteProduct.isPending}
                >
                  {deleteProduct.isPending ? "Đang xoá..." : "Xoá sản phẩm"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
