import { motion } from "motion/react";
import { LevelBar, MicroHistogram, StatusChip } from "@/components/atoms";
import type { ItemResult, ProtocolItem } from "@/types";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ItemRowProps {
  definition: ProtocolItem;
  result: ItemResult | undefined;
  /** True while waiting for the first assessment. */
  pending: boolean;
}

/** One protocol item: label, segmented level bar, probability histogram, confidence, status. */
export function ItemRow({ definition, result, pending }: ItemRowProps) {
  const status = result?.status ?? "missing";
  const value = result?.value ?? null;
  const flashKey = `${definition.id}-${value}-${status}`;

  return (
    <div
      role="row"
      className="relative grid grid-cols-[minmax(0,1fr)_minmax(96px,140px)_auto_40px_76px] items-center gap-4 px-4 py-2.5"
    >
      {result ? (
        <motion.span
          key={flashKey}
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-foreground/[0.045]"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        />
      ) : null}
      <div role="cell" className="min-w-0">
        <div className="truncate text-[13px] font-medium text-foreground">{definition.label}</div>
        <div className={cn("truncate text-xs", value === null ? "text-faint" : "text-muted-foreground")}>
          {pending ? "Listening…" : value === null ? "Not described" : (result?.value_label ?? definition.levels[value])}
        </div>
      </div>
      <div role="cell" className="flex items-center gap-2.5">
        <span className={cn("w-3 text-right font-mono text-[15px] tabular-nums", value === null ? "text-faint" : "text-foreground")}>
          {value === null ? "–" : value}
        </span>
        <LevelBar levels={definition.levels.length} value={value} status={status} />
      </div>
      <div role="cell">
        <MicroHistogram levels={definition.levels} probabilities={result?.probabilities ?? {}} selected={value} />
      </div>
      <div role="cell" className="text-right font-mono text-xs tabular-nums text-muted-foreground">
        {result ? formatPercent(result.confidence) : "–"}
      </div>
      <div role="cell" className="flex justify-end">
        {pending ? (
          <span className="inline-flex h-5 w-[76px] items-center justify-center rounded-full border border-dashed border-border text-[11px] text-faint">
            Pending
          </span>
        ) : (
          <StatusChip status={status} />
        )}
      </div>
    </div>
  );
}
