import { normalizeCardRarity } from "@shared/cardRarity";
import { Badge } from "@/components/ui/badge";

type RarityBadgeProps = {
  rarity?: string | null;
};

const RARITY_BADGE_STYLES: Record<string, string> = {
  FUR: "border-pink-300 bg-gradient-to-r from-rose-950 via-fuchsia-700 to-pink-300 text-white shadow-[0_0_10px_rgba(244,114,182,0.55)]",
  AR: "border-slate-300 bg-gradient-to-r from-white via-slate-100 to-slate-300 text-slate-900 shadow-[0_0_8px_rgba(203,213,225,0.5)]",
  RR: "border-blue-300 bg-blue-100 text-blue-800",
  R: "border-teal-300 bg-teal-100 text-teal-800",
  SR: "border-amber-300 bg-amber-100 text-amber-900",
  SAR: "border-violet-700 bg-gradient-to-r from-slate-950 via-violet-800 to-fuchsia-700 text-white shadow-[0_0_10px_rgba(168,85,247,0.45)]",
  MUR: "border-yellow-400 bg-gradient-to-r from-yellow-600 via-amber-400 to-yellow-100 text-slate-950 shadow-[0_0_10px_rgba(250,204,21,0.55)]",
  ONEPICE: "border-red-700 bg-gradient-to-r from-slate-950 via-red-700 to-orange-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.45)]",
  Promo: "border-cyan-300 bg-gradient-to-r from-cyan-700 via-cyan-500 to-cyan-300 text-white shadow-[0_0_10px_rgba(34,211,238,0.5)]",
  Khác: "border-slate-300 bg-gradient-to-r from-white via-slate-100 to-white text-slate-900 shadow-[0_0_8px_rgba(203,213,225,0.48)]",
};

export function RarityBadge({ rarity }: RarityBadgeProps) {
  const label = normalizeCardRarity(rarity);
  if (!label) return null;

  return (
    <Badge
      variant="outline"
      className={`shrink-0 border px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide ${RARITY_BADGE_STYLES[label] || "border-border bg-muted text-muted-foreground"}`}
      aria-label={`Rarity: ${label}`}
    >
      <span className="rarity-rgb-text">{label}</span>
    </Badge>
  );
}
