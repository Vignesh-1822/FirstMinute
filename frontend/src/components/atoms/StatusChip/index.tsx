import type { ItemStatus } from "@/types";
import { cn } from "@/lib/utils";

interface StatusChipProps {
  status: ItemStatus;
  className?: string;
}

const COPY: Record<ItemStatus, string> = {
  confident: "Confident",
  uncertain: "Confirm",
  missing: "Ask",
};

/** Item status: confident (teal dot), uncertain (amber), missing (dashed, neutral). */
export function StatusChip({ status, className }: StatusChipProps) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-[76px] items-center justify-center gap-1.5 rounded-full px-2 text-[11px] font-medium",
        status === "confident" && "bg-confident/10 text-confident-ink",
        status === "uncertain" && "bg-uncertain-soft text-uncertain-ink",
        status === "missing" && "border border-dashed border-border-strong text-muted-foreground",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          status === "confident" && "bg-confident",
          status === "uncertain" && "bg-uncertain",
          status === "missing" && "border border-dashed border-muted-foreground",
        )}
      />
      {COPY[status]}
    </span>
  );
}
