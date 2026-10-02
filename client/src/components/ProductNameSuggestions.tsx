import { trpc } from "@/lib/trpc";
import { formatYen } from "@shared/formatYen";
import { productTypeLabel } from "@shared/productCreateType";

type ProductNameSuggestion = {
  id: number;
  name: string;
  type: "card" | "box" | "pack" | "junk_pack";
  series?: string | null;
  buyPrice?: number | string | null;
  quantity?: number | null;
  status?: string | null;
};

type ProductNameSuggestionsProps = {
  search: string;
  onSelect: (product: ProductNameSuggestion) => void;
  className?: string;
};

/** Suggests existing private inventory names as soon as the first character is entered. */
export function ProductNameSuggestions({ search, onSelect, className = "" }: ProductNameSuggestionsProps) {
  const trimmedSearch = search.trim();
  const { data: suggestions = [], isFetching } = trpc.products.suggestions.useQuery(
    { search: trimmedSearch },
    { enabled: trimmedSearch.length >= 1 },
  );

  if (!trimmedSearch) return null;

  return (
    <div className={`relative z-20 mt-1 overflow-hidden rounded-lg border border-sky-400/35 bg-background/95 shadow-lg ${className}`} role="listbox" aria-label="Gợi ý tên sản phẩm trong kho">
      <p className="border-b border-border/70 px-3 py-2 text-xs font-medium text-muted-foreground">Tên trùng hoặc gần giống trong kho — chọn để tránh nhập sai</p>
      {isFetching ? <p className="px-3 py-2 text-xs text-sky-200">Đang tìm tên sản phẩm trong kho…</p> : suggestions.length === 0 ? <p className="px-3 py-2 text-xs text-muted-foreground">Chưa có tên trùng trong kho.</p> : suggestions.map((product: ProductNameSuggestion) => (
        <button
          key={product.id}
          type="button"
          role="option"
          aria-label={`Chọn ${product.name}, ${productTypeLabel(product.type)}, giá mua ${formatYen(Number(product.buyPrice || 0))} mỗi sản phẩm`}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-sky-500/10 focus-visible:bg-sky-500/15 focus-visible:outline-none"
          onClick={() => onSelect(product)}
        >
          <span className="min-w-0 flex-1 truncate font-medium text-foreground">{product.name}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{productTypeLabel(product.type)}</span>
          <span className="shrink-0 text-xs font-semibold text-sky-200">{formatYen(Number(product.buyPrice || 0))}/SP</span>
          <span className="shrink-0 text-xs text-muted-foreground">SL {product.quantity || 0}</span>
        </button>
      ))}
    </div>
  );
}
