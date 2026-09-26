import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface MicroHistogramProps {
  levels: string[];
  probabilities: Record<string, number>;
  selected: number | null;
  className?: string;
}

/** Probability per level as tiny vertical bars; the chosen level is inked. */
export function MicroHistogram({ levels, probabilities, selected, className }: MicroHistogramProps) {
  const description = levels.map((level) => `${level} ${Math.round((probabilities[level] ?? 0) * 100)}%`).join(", ");
  return (
    <span role="img" aria-label={`Probabilities: ${description}`} title={description} className={cn("flex h-5 items-end gap-[3px]", className)}>
      {levels.map((level, index) => {
        const probability = probabilities[level] ?? 0;
        return (
          <span key={level} className="relative h-full w-[5px] overflow-hidden rounded-[2px] bg-foreground/[0.06]">
            <motion.span
              className={cn(
                "absolute inset-x-0 bottom-0 origin-bottom rounded-[2px]",
                index === selected ? "bg-foreground/80" : "bg-foreground/25",
              )}
              style={{ height: "100%" }}
              initial={false}
              animate={{ scaleY: Math.max(0.06, probability) }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          </span>
        );
      })}
    </span>
  );
}
