import { StatusChip } from "@/components/atoms";
import type { ItemStatus } from "@/types";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

interface MedevacLineRowProps {
  line: number;
  label: string;
  value: string | null;
  confidence: number | null;
  status: ItemStatus | "code";
}

/** One line of the 9-line request, stencil style. */
export function MedevacLineRow({ line, label, value, confidence, status }: MedevacLineRowProps) {
  return (
    <div role="row" className="grid grid-cols-[40px_minmax(0,150px)_minmax(0,1fr)_40px_76px] items-center gap-3 px-4 py-2">
      <span role="cell" className="font-mono text-[18px] font-medium tabular-nums text-faint">
        {String(line).padStart(2, "0")}
      </span>
      <span role="cell" className="truncate text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      <span role="cell" className={cn("truncate font-mono text-[13px] uppercase", value ? "text-foreground" : "text-faint")}>
        {value ?? "—"}
      </span>
      <span role="cell" className="text-right font-mono text-xs tabular-nums text-muted-foreground">
        {confidence === null ? "" : formatPercent(confidence)}
      </span>
      <span role="cell" className="flex justify-end">
        {status === "code" ? (
          <span className="inline-flex h-5 w-[76px] items-center justify-center rounded-full border text-[11px] text-muted-foreground">
            Extracted
          </span>
        ) : (
          <StatusChip status={status} />
        )}
      </span>
    </div>
  );
}
