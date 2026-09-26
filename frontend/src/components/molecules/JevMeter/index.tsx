import { AnimatedNumber } from "@/components/atoms";
import type { JevMeterTotals } from "@/types";
import { cn } from "@/lib/utils";

interface JevMeterProps {
  totals: JevMeterTotals;
  className?: string;
}

/** "Jev · 11 decisions · 1.4 s total · $0.0003" running meter. */
export function JevMeter({ totals, className }: JevMeterProps) {
  return (
    <div
      className={cn("flex h-7 items-center gap-2 rounded-md border px-2.5 text-[11.5px] text-muted-foreground", className)}
      aria-label={`Jev: ${totals.calls} decisions, ${(totals.latencyMs / 1000).toFixed(2)} seconds total, ${totals.costUsd.toFixed(6)} dollars`}
    >
      <span className="font-medium text-foreground">Jev</span>
      <span className="text-faint">·</span>
      <span>
        <AnimatedNumber value={totals.calls} className="text-foreground" /> decisions
      </span>
      <span className="text-faint">·</span>
      <span>
        <AnimatedNumber value={totals.latencyMs / 1000} decimals={2} className="text-foreground" /> s total
      </span>
      <span className="text-faint">·</span>
      <AnimatedNumber value={totals.costUsd} decimals={5} prefix="$" className="text-foreground" />
    </div>
  );
}
