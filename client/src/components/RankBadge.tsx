import { normalizeCardRank } from "@shared/cardRank";
import { formatYen } from "@shared/formatYen";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type RankBadgeProps = {
  rank?: string | null;
  marketPrice?: number | string | null;
  className?: string;
};

const RANK_BADGE_STYLES: Record<string, string> = {
  A: "border-yellow-400 bg-gradient-to-r from-yellow-700 via-amber-400 to-yellow-200 text-slate-950 shadow-[0_0_10px_rgba(250,204,21,0.55)]",
  B: "border-red-500 bg-gradient-to-r from-red-800 via-red-500 to-rose-400 text-white shadow-[0_0_10px_rgba(239,68,68,0.52)]",
  C: "border-cyan-400 bg-gradient-to-r from-blue-800 via-sky-500 to-cyan-300 text-white shadow-[0_0_10px_rgba(56,189,248,0.52)]",
  D: "border-slate-500 bg-gradient-to-r from-black via-slate-900 to-slate-700 text-white shadow-[0_0_10px_rgba(15,23,42,0.72)]",
};

export function RankBadge({ rank, marketPrice, className = "" }: RankBadgeProps) {
  const value = normalizeCardRank(rank);
  const price = Number(marketPrice) || 0;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className={`inline-flex shrink-0 cursor-help rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${className}`}>
          <Badge
            variant="outline"
            className={`shrink-0 border px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide transition-transform duration-150 hover:-translate-y-0.5 hover:brightness-110 ${RANK_BADGE_STYLES[value]}`}
            aria-label={`Rank Card ${value}. ${price > 0 ? `Giá thị trường ${formatYen(price)}` : "Chưa có giá thị trường"}`}
          >
            <span className="rank-rgb-text">Rank {value}</span>
          </Badge>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={7} className="max-w-56 border border-white/15 bg-slate-950 px-3 py-2 text-left text-xs text-slate-100 shadow-xl">
        <p className="font-bold">Rank {value}</p>
        <p className="mt-0.5 text-slate-300">{price > 0 ? `Giá thị trường theo Rank ${value}: ${formatYen(price)}` : `Chưa có giá thị trường cho Rank ${value}`}</p>
      </TooltipContent>
    </Tooltip>
  );
}
