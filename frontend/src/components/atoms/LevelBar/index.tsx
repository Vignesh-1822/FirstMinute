import { motion } from "motion/react";
import type { ItemStatus } from "@/types";
import { cn } from "@/lib/utils";

interface LevelBarProps {
  /** Number of levels including 0, e.g. 3 for a 0/1/2 item. */
  levels: number;
  value: number | null;
  status: ItemStatus;
  className?: string;
}

/** Segmented level bar: one segment per level above zero, filled up to the value. */
export function LevelBar({ levels, value, status, className }: LevelBarProps) {
  const segments = Math.max(1, levels - 1);
  return (
    <span
      role="meter"
      aria-valuemin={0}
      aria-valuemax={segments}
      aria-valuenow={value ?? undefined}
      aria-label={value === null ? "Not assessed" : `Level ${value} of ${segments}`}
      className={cn("flex w-full items-center gap-1", className)}
    >
      {Array.from({ length: segments }, (_, index) => {
        const filled = value !== null && index < value;
        return (
          <span
            key={index}
            className={cn(
              "relative h-1.5 flex-1 overflow-hidden rounded-full",
              status === "missing" ? "border border-dashed border-border-strong" : "bg-foreground/[0.08]",
            )}
          >
            <motion.span
              className={cn(
                "absolute inset-0 origin-left rounded-full",
                status === "uncertain" ? "bg-uncertain" : "bg-foreground/85",
              )}
              initial={false}
              animate={{ scaleX: filled ? 1 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30, delay: filled ? index * 0.06 : 0 }}
            />
          </span>
        );
      })}
    </span>
  );
}
