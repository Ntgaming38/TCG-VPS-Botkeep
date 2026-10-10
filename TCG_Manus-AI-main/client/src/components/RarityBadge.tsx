import { normalizeCardRarity } from "@shared/cardRarity";
import { Badge } from "@/components/ui/badge";

type RarityBadgeProps = {
  rarity?: string | null;
};

const RARITY_BADGE_STYLES: Record<string, string> = {
  Common: "border-slate-300 bg-slate-100 text-slate-700",
  Uncommon: "border-emerald-300 bg-emerald-100 text-emerald-800",
  Rare: "border-sky-300 bg-sky-100 text-sky-800",
  AR: "border-green-300 bg-green-100 text-green-800",
  RR: "border-blue-300 bg-blue-100 text-blue-800",
  R: "border-teal-300 bg-teal-100 text-teal-800",
  SR: "border-amber-300 bg-amber-100 text-amber-900",
  SAR: "border-fuchsia-300 bg-fuchsia-100 text-fuchsia-800",
  MUR: "border-violet-700 bg-gradient-to-r from-slate-950 via-violet-800 to-fuchsia-700 text-white shadow-[0_0_10px_rgba(168,85,247,0.45)]",
  Promo: "border-rose-300 bg-rose-100 text-rose-800",
  "One Piece": "border-red-700 bg-gradient-to-r from-slate-950 via-red-700 to-orange-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.45)]",
  Manga: "border-red-700 bg-gradient-to-r from-slate-950 via-red-700 to-orange-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.45)]",
  SEC: "border-amber-400 bg-amber-100 text-amber-900",
  SP: "border-rose-400 bg-rose-100 text-rose-900",
  L: "border-purple-400 bg-purple-100 text-purple-900",
  UC: "border-cyan-300 bg-cyan-100 text-cyan-800",
  C: "border-slate-300 bg-slate-100 text-slate-700",
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
      {label}
    </Badge>
  );
}
