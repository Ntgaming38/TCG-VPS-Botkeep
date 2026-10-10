import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import { getCardRarityOptionsForSeries, getCardRarityPriority, normalizeCardRarity } from "@shared/cardRarity";
import { RarityBadge } from "@/components/RarityBadge";
import { DEFAULT_PRODUCT_LIST_COLUMNS, PRODUCT_LIST_COLUMN_OPTIONS, type ProductListColumnKey } from "@shared/productListPreferences";
import { Plus, Search, Filter, Package, CreditCard, Box, Gift, LayoutGrid, List, MoreVertical, Pencil, Trash2, ImagePlus } from "lucide-react";
import { useEffect, useMemo, useState, useRef } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Products() {
  const [location] = useLocation();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [cardSort, setCardSort] = useState<"rarity" | "roi" | "marketPrice">("rarity");
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => typeof window === "undefined" ? "grid" : (window.localStorage.getItem("tcg-products-view-mode") === "list" ? "list" : "grid"));
  const [visibleListColumns, setVisibleListColumns] = useState<ProductListColumnKey[]>(() => {
    if (typeof window === "undefined") return DEFAULT_PRODUCT_LIST_COLUMNS;
    try {
      const stored = JSON.parse(window.localStorage.getItem("tcg-products-list-columns") || "[]");
      const valid = Array.isArray(stored) ? stored.filter((key): key is ProductListColumnKey => PRODUCT_LIST_COLUMN_OPTIONS.some((column) => column.key === key)) : [];
      return valid.length ? valid : DEFAULT_PRODUCT_LIST_COLUMNS;
    } catch { return DEFAULT_PRODUCT_LIST_COLUMNS; }
  });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<{ id: number; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [newProduct, setNewProduct] = useState({
    name: "", type: "box" as "card" | "box" | "pack", series: "Pokemon",
    setName: "", quantity: 1, buyPrice: 0, marketPrice: 0, description: "",
    rarity: "", psaGrade: "", cardNumber: "", language: "Japanese", condition: "New",
  });

  // Determine filter from URL
  const pathType = location.split("/san-pham/")[1];
  const activeType = pathType || typeFilter;

  const { data: products, refetch } = trpc.products.list.useQuery({
    type: activeType !== "all" ? activeType : undefined,
    search: search || undefined,
  });

  useEffect(() => { window.localStorage.setItem("tcg-products-view-mode", viewMode); }, [viewMode]);
  useEffect(() => { window.localStorage.setItem("tcg-products-list-columns", JSON.stringify(visibleListColumns)); }, [visibleListColumns]);

  const addProduct = trpc.products.create.useMutation({
    onSuccess: () => {
      toast.success("Đã thêm sản phẩm thành công!");
      setShowAddDialog(false);
      setNewProduct({ name: "", type: "box", series: "Pokemon", setName: "", quantity: 1, buyPrice: 0, marketPrice: 0, description: "", rarity: "", psaGrade: "", cardNumber: "", language: "Japanese", condition: "New" });
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateProduct = trpc.products.update.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật sản phẩm!");
      setShowEditDialog(false);
      setEditingProduct(null);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteProduct = trpc.products.delete.useMutation({
    onSuccess: () => {
      setDeleteCandidate(null);
      toast.success("Đã xóa sản phẩm!");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleImageUpload = async (productId: number, file: File) => {
    setUploadingId(productId);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const response = await fetch("/api/upload-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64, filename: file.name, contentType: file.type }),
        });
        if (response.ok) {
          const { url } = await response.json();
          await updateProduct.mutateAsync({ id: productId, image: url });
          toast.success("Đã upload ảnh!");
        } else {
          toast.error("Upload ảnh thất bại");
        }
        setUploadingId(null);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Upload ảnh thất bại");
      setUploadingId(null);
    }
  };

  const handleDelete = (id: number, name: string) => {
    setDeleteCandidate({ id, name });
  };

  const openEdit = (product: any) => {
    setEditingProduct({
      id: product.id,
      type: product.type,
      name: product.name,
      series: product.series || "Pokemon",
      setName: product.setName || "",
      quantity: product.quantity,
      buyPrice: Number(product.buyPrice),
      marketPrice: Number(product.marketPrice) || 0,
      description: product.description || "",
      cardNumber: product.cardNumber || "",
      language: product.language || "Japanese",
      rarity: normalizeCardRarity(product.rarity),
      condition: product.condition || "New",
      psaGrade: product.psaGrade || "",
    });
    setShowEditDialog(true);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "card": return <CreditCard className="h-4 w-4" />;
      case "box": return <Box className="h-4 w-4" />;
      case "pack": return <Gift className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getTypeLabel = () => {
    if (activeType === "card") return "Card";
    if (activeType === "box") return "Box";
    if (activeType === "pack") return "Pack";
    return "Sản phẩm";
  };

  const toggleListColumn = (key: ProductListColumnKey) => setVisibleListColumns((current) => {
    if (current.includes(key)) {
      if (current.length === 1) { toast.error("Danh sách cần giữ ít nhất một cột thông tin."); return current; }
      return current.filter((column) => column !== key);
    }
    return [...current, key];
  });

  const sortedProducts = useMemo(() => {
    if (!products) return [];
    if (activeType !== "card") return products;

    return [...products].sort((a: any, b: any) => {
      if (cardSort === "rarity") {
        const rarityDiff = getCardRarityPriority(a.rarity) - getCardRarityPriority(b.rarity);
        if (rarityDiff !== 0) return rarityDiff;
        return Number(b.marketPrice || 0) - Number(a.marketPrice || 0);
      }

      if (cardSort === "roi") {
        const calculateRoi = (product: any) => {
          const buyPrice = Number(product.buyPrice || 0);
          const marketPrice = Number(product.marketPrice || 0);
          return buyPrice > 0 ? (marketPrice - buyPrice) / buyPrice : Number.NEGATIVE_INFINITY;
        };
        return calculateRoi(b) - calculateRoi(a);
      }

      return Number(b.marketPrice || 0) - Number(a.marketPrice || 0);
    });
  }, [activeType, cardSort, products]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{getTypeLabel()}</h1>
          <p className="text-muted-foreground text-sm mt-1">Quản lý {getTypeLabel().toLowerCase()} của bạn</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Thêm mới
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Thêm {getTypeLabel()} mới</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Loại</Label>
                  <Select value={newProduct.type} onValueChange={(v) => setNewProduct(p => ({ ...p, type: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="box">Box</SelectItem>
                      <SelectItem value="pack">Pack</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Series</Label>
                  <Select value={newProduct.series} onValueChange={(v) => setNewProduct(p => ({ ...p, series: v, rarity: p.series === v ? p.rarity : "" }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pokemon">Pokémon</SelectItem>
                      <SelectItem value="One Piece">One Piece</SelectItem>
                      <SelectItem value="Other">Khác</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tên sản phẩm</Label>
                <Input value={newProduct.name} onChange={(e) => setNewProduct(p => ({ ...p, name: e.target.value }))} placeholder="VD: Mega Dream EX" />
              </div>
              <div className="space-y-2">
                <Label>Set</Label>
                <Input value={newProduct.setName} onChange={(e) => setNewProduct(p => ({ ...p, setName: e.target.value }))} placeholder="VD: Mega Dream EX" />
              </div>
              {newProduct.type === "card" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Card Number</Label>
                      <Input value={newProduct.cardNumber} onChange={(e) => setNewProduct(p => ({ ...p, cardNumber: e.target.value }))} placeholder="001/187" />
                    </div>
                    <div className="space-y-2">
                      <Label>Rarity</Label>
                      <Select value={newProduct.rarity} onValueChange={(v) => setNewProduct(p => ({ ...p, rarity: v }))}>
                        <SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger>
                        <SelectContent>
                          {getCardRarityOptionsForSeries(newProduct.series).map((rarity) => (
                            <SelectItem key={rarity.value} value={rarity.value}>{rarity.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>PSA Grade</Label>
                      <Select value={newProduct.psaGrade} onValueChange={(v) => setNewProduct(p => ({ ...p, psaGrade: v }))}>
                        <SelectTrigger><SelectValue placeholder="Không có" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Không có</SelectItem>
                          <SelectItem value="PSA10">PSA10</SelectItem>
                          <SelectItem value="PSA9">PSA9</SelectItem>
                          <SelectItem value="PSA8">PSA8</SelectItem>
                          <SelectItem value="PSA7">PSA7</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Condition</Label>
                      <Select value={newProduct.condition} onValueChange={(v) => setNewProduct(p => ({ ...p, condition: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="New">New</SelectItem>
                          <SelectItem value="Mint">Mint</SelectItem>
                          <SelectItem value="Near Mint">Near Mint</SelectItem>
                          <SelectItem value="Used">Used</SelectItem>
                          <SelectItem value="Damaged">Damaged</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Số lượng</Label>
                  <Input type="number" min={1} value={newProduct.quantity} onChange={(e) => setNewProduct(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))} />
                </div>
                <div className="space-y-2">
                  <Label>Giá mua (¥)</Label>
                  <Input type="number" min={0} value={newProduct.buyPrice} onChange={(e) => setNewProduct(p => ({ ...p, buyPrice: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <Label>Giá thị trường (¥)</Label>
                  <Input type="number" min={0} value={newProduct.marketPrice} onChange={(e) => setNewProduct(p => ({ ...p, marketPrice: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Ghi chú</Label>
                <Textarea value={newProduct.description} onChange={(e) => setNewProduct(p => ({ ...p, description: e.target.value }))} placeholder="Ghi chú thêm..." />
              </div>
              <Button
                className="w-full"
                onClick={() => addProduct.mutate(newProduct)}
                disabled={!newProduct.name || addProduct.isPending}
              >
                {addProduct.isPending ? "Đang lưu..." : "Lưu sản phẩm"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sửa sản phẩm</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Tên sản phẩm</Label>
                <Input value={editingProduct.name} onChange={(e) => setEditingProduct((p: any) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Series</Label>
                  <Select value={editingProduct.series} onValueChange={(value) => setEditingProduct((p: any) => ({ ...p, series: value, rarity: p.series === value ? p.rarity : "" }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pokemon">Pokémon</SelectItem>
                      <SelectItem value="One Piece">One Piece</SelectItem>
                      <SelectItem value="Other">Khác</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Set</Label>
                  <Input value={editingProduct.setName} onChange={(e) => setEditingProduct((p: any) => ({ ...p, setName: e.target.value }))} />
                </div>
              </div>
              {editingProduct.type === "card" && (
                <div className="space-y-2">
                  <Label>Rarity</Label>
                  <Select value={editingProduct.rarity || undefined} onValueChange={(value) => setEditingProduct((p: any) => ({ ...p, rarity: value }))}>
                    <SelectTrigger><SelectValue placeholder="Chọn rarity" /></SelectTrigger>
                    <SelectContent>
                      {getCardRarityOptionsForSeries(editingProduct.series).map((rarity) => (
                        <SelectItem key={rarity.value} value={rarity.value}>{rarity.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Số lượng</Label>
                  <Input type="number" min={0} value={editingProduct.quantity} onChange={(e) => setEditingProduct((p: any) => ({ ...p, quantity: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <Label>Giá mua (¥)</Label>
                  <Input type="number" min={0} value={editingProduct.buyPrice} onChange={(e) => setEditingProduct((p: any) => ({ ...p, buyPrice: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <Label>Giá thị trường (¥)</Label>
                  <Input type="number" min={0} value={editingProduct.marketPrice} onChange={(e) => setEditingProduct((p: any) => ({ ...p, marketPrice: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Ghi chú</Label>
                <Textarea value={editingProduct.description} onChange={(e) => setEditingProduct((p: any) => ({ ...p, description: e.target.value }))} />
              </div>
              <Button
                className="w-full"
                onClick={() => updateProduct.mutate(editingProduct)}
                disabled={updateProduct.isPending}
              >
                {updateProduct.isPending ? "Đang lưu..." : "Cập nhật"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && uploadingId) {
            handleImageUpload(uploadingId, file);
          }
          e.target.value = "";
        }}
      />

      {/* Search and Filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm sản phẩm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        {!pathType && (
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Loại" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="box">Box</SelectItem>
              <SelectItem value="pack">Pack</SelectItem>
            </SelectContent>
          </Select>
        )}
        {activeType === "card" && (
          <Select value={cardSort} onValueChange={(value) => setCardSort(value as "rarity" | "roi" | "marketPrice")}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Sắp xếp Card" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rarity">Độ hiếm: MUR → R</SelectItem>
              <SelectItem value="roi">ROI: cao đến thấp</SelectItem>
              <SelectItem value="marketPrice">Giá thị trường: cao đến thấp</SelectItem>
            </SelectContent>
          </Select>
        )}
        <div className="ml-auto inline-flex rounded-lg border border-border bg-secondary/30 p-1" aria-label="Chế độ hiển thị">
          <Button type="button" size="sm" variant={viewMode === "grid" ? "secondary" : "ghost"} aria-label="Hiển thị thẻ ảnh" aria-pressed={viewMode === "grid"} className="h-8 gap-1.5 px-2.5" onClick={() => setViewMode("grid")}><LayoutGrid className="h-4 w-4" /><span className="hidden sm:inline">Thẻ ảnh</span></Button>
          <Button type="button" size="sm" variant={viewMode === "list" ? "secondary" : "ghost"} aria-label="Hiển thị danh sách" aria-pressed={viewMode === "list"} className="h-8 gap-1.5 px-2.5" onClick={() => setViewMode("list")}><List className="h-4 w-4" /><span className="hidden sm:inline">Danh sách</span></Button>
        </div>
        {viewMode === "list" && <DropdownMenu><DropdownMenuTrigger asChild><Button type="button" size="icon" variant="outline" title="Tùy chọn cột" aria-label="Tùy chọn cột danh sách" className="h-10 w-10"><MoreVertical className="h-5 w-5" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-52"><div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Cột trong danh sách</div>{PRODUCT_LIST_COLUMN_OPTIONS.map((column) => <DropdownMenuItem key={column.key} onSelect={(event) => { event.preventDefault(); toggleListColumn(column.key); }} className="gap-2"><input type="checkbox" className="pointer-events-none accent-primary" checked={visibleListColumns.includes(column.key)} readOnly /><span>{column.label}</span></DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>}
      </div>

      {/* Products Grid */}
      {!sortedProducts || sortedProducts.length === 0 ? (
        <div className="text-center py-16">
          <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-medium text-muted-foreground">Chưa có sản phẩm nào</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">Bấm "Thêm mới" để bắt đầu</p>
        </div>
      ) : (
        viewMode === "grid" ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedProducts.map((product: any) => (
            <Card key={product.id} className="bg-card neon-card hover:border-primary/30 transition-colors group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <Badge variant="secondary" className="text-xs">
                    {getTypeIcon(product.type)}
                    <span className="ml-1 capitalize">{product.type}</span>
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Badge variant={product.status === 'in_stock' ? 'default' : 'secondary'} className="text-xs">
                      {product.status === 'in_stock' ? 'Trong kho' : product.status === 'sold' ? 'Đã bán' : product.status}
                    </Badge>
                    <ProductActionMenu product={product} onEdit={openEdit} onUpload={(id) => { setUploadingId(id); fileInputRef.current?.click(); }} onDelete={handleDelete} />
                  </div>
                </div>
                {/* Product image */}
                {product.image && (
                  <div className="mb-3 rounded-lg overflow-hidden bg-secondary/30 aspect-[4/3]">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="mt-3 flex min-w-0 items-center gap-2">
                  <h3 className="min-w-0 flex-1 truncate font-semibold text-sm">{product.name}</h3>
                  {product.type === "card" && <RarityBadge rarity={product.rarity} />}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{product.series} - {product.setName || 'N/A'}</p>
                <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">SL:</span>
                    <span className="ml-1 font-medium">{product.quantity}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Mua:</span>
                    <span className="ml-1 font-medium">¥{Number(product.buyPrice).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Giá TT:</span>
                    <span className="ml-1 font-medium">¥{Number(product.marketPrice).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Lãi:</span>
                    <span className={`ml-1 font-medium ${Number(product.marketPrice) - Number(product.buyPrice) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {Number(product.marketPrice) - Number(product.buyPrice) >= 0 ? '+' : ''}¥{(Number(product.marketPrice) - Number(product.buyPrice)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div> : <div className="space-y-2">
          {sortedProducts.map((product: any) => {
            const metricColumns = visibleListColumns.filter((column) => ["quantity", "buyPrice", "marketPrice", "profit"].includes(column));
            return <Card key={product.id} className="bg-card transition-colors hover:border-primary/30"><CardContent className="flex items-center gap-2 p-2.5 sm:gap-3 sm:p-3">
              <div className="min-w-0 flex-1"><div className="flex min-w-0 flex-wrap items-center gap-1.5"><h3 className="max-w-full truncate text-sm font-semibold">{product.name}</h3><Badge variant="secondary" className="text-[10px] capitalize">{product.type}</Badge>{product.type === "card" && visibleListColumns.includes("rarity") && <RarityBadge rarity={product.rarity} />}{visibleListColumns.includes("status") && <Badge variant={product.status === "in_stock" ? "default" : "secondary"} className="text-[10px]">{product.status === "in_stock" ? "Trong kho" : product.status === "sold" ? "Đã bán" : product.status}</Badge>}</div>{visibleListColumns.includes("series") && <p className="mt-0.5 truncate text-xs text-muted-foreground">{product.series} · {product.setName || "N/A"}</p>}</div>
              {metricColumns.length > 0 && <div className="grid shrink-0 grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] sm:flex sm:items-center sm:gap-x-3">{metricColumns.map((column) => <ProductListMetric key={column} product={product} column={column} />)}</div>}
              <ProductActionMenu product={product} onEdit={openEdit} onUpload={(id) => { setUploadingId(id); fileInputRef.current?.click(); }} onDelete={handleDelete} />
            </CardContent></Card>;
          })}
        </div>
      )}
      <AlertDialog open={deleteCandidate !== null} onOpenChange={(open) => !open && setDeleteCandidate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Xóa sản phẩm khỏi kho?</AlertDialogTitle><AlertDialogDescription>Bạn có chắc muốn xóa <strong className="text-foreground">{deleteCandidate?.name}</strong>? Thao tác này không thể hoàn tác. Nếu sản phẩm đã phát sinh giao dịch bán, hệ thống sẽ giữ nguyên dữ liệu và thông báo lý do.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={deleteProduct.isPending}>Hủy</AlertDialogCancel><AlertDialogAction className="bg-red-600 text-white hover:bg-red-700" disabled={deleteProduct.isPending} onClick={() => deleteCandidate && deleteProduct.mutate({ id: deleteCandidate.id })}>{deleteProduct.isPending ? "Đang xóa..." : "Xóa sản phẩm"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProductActionMenu({ product, onEdit, onUpload, onDelete }: { product: any; onEdit: (product: any) => void; onUpload: (id: number) => void; onDelete: (id: number, name: string) => void }) {
  return <div className="group relative shrink-0"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Tùy chọn" className="h-11 w-11 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-white/80 sm:h-8 sm:w-8"><MoreVertical className="h-5 w-5" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => onEdit(product)}><Pencil className="mr-2 h-3 w-3" />Sửa</DropdownMenuItem><DropdownMenuItem onClick={() => onUpload(product.id)}><ImagePlus className="mr-2 h-3 w-3" />Upload ảnh</DropdownMenuItem><DropdownMenuItem className="text-red-400" onClick={() => onDelete(product.id, product.name)}><Trash2 className="mr-2 h-3 w-3" />Xóa</DropdownMenuItem></DropdownMenuContent></DropdownMenu><span role="tooltip" className="pointer-events-none absolute right-0 top-full z-20 mt-1 whitespace-nowrap rounded bg-black/85 px-2 py-1 text-[11px] text-white opacity-0 shadow transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">Tùy chọn</span></div>;
}

function ProductListMetric({ product, column }: { product: any; column: ProductListColumnKey }) {
  const profit = Number(product.marketPrice) - Number(product.buyPrice);
  if (column === "quantity") return <span className="text-muted-foreground">SL <strong className="ml-1 text-foreground">{product.quantity}</strong></span>;
  if (column === "buyPrice") return <span className="text-muted-foreground">Mua <strong className="ml-1 text-foreground">¥{Number(product.buyPrice).toLocaleString()}</strong></span>;
  if (column === "marketPrice") return <span className="text-muted-foreground">Giá TT <strong className="ml-1 text-foreground">¥{Number(product.marketPrice).toLocaleString()}</strong></span>;
  return <span className="text-muted-foreground">Lãi <strong className={profit >= 0 ? "ml-1 text-green-400" : "ml-1 text-red-400"}>{profit >= 0 ? "+" : ""}¥{profit.toLocaleString()}</strong></span>;
}
