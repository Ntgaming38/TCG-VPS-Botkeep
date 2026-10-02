import { Badge } from "@/components/ui/badge";
import { Box, CreditCard, Gift, PackageOpen } from "lucide-react";
import { productTypeLabel } from "@shared/productCreateType";

type ProductTypeBadgeProps = {
  type?: string | null;
  compact?: boolean;
  className?: string;
};

const typeStyles: Record<string, string> = {
  card: "border-blue-400/45 bg-blue-500/10 text-blue-200",
  box: "border-cyan-400/45 bg-cyan-500/10 text-cyan-200",
  pack: "border-violet-400/45 bg-violet-500/10 text-violet-200",
  junk_pack: "border-amber-300 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 text-slate-950 shadow-[0_0_10px_rgba(251,191,36,0.42)]",
};

function ProductTypeIcon({ type }: { type: string }) {
  const iconClass = "h-3.5 w-3.5";
  if (type === "card") return <CreditCard className={iconClass} aria-hidden="true" />;
  if (type === "box") return <Box className={iconClass} aria-hidden="true" />;
  if (type === "pack") return <Gift className={iconClass} aria-hidden="true" />;
  if (type === "junk_pack") return <PackageOpen className={iconClass} aria-hidden="true" />;
  return null;
}

export function ProductTypeBadge({ type, compact = false, className = "" }: ProductTypeBadgeProps) {
  const normalizedType = type || "";
  const label = productTypeLabel(normalizedType);
  const style = typeStyles[normalizedType] || "border-border bg-secondary/45 text-muted-foreground";

  return (
    <Badge
      variant="outline"
      className={`inline-flex shrink-0 items-center gap-1 border font-semibold ${compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"} ${style} ${className}`}
      aria-label={`Loại sản phẩm: ${label}`}
    >
      <ProductTypeIcon type={normalizedType} />
      <span>{label}</span>
    </Badge>
  );
}
