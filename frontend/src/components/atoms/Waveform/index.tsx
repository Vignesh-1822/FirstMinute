import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

interface WaveformProps {
  active: boolean;
  bars?: number;
  className?: string;
}

const HEIGHTS = [0.35, 0.7, 0.5, 0.95, 0.6, 0.8, 0.4, 0.65, 0.9, 0.45, 0.75, 0.55];

/** Compact voice waveform; idles flat when inactive. */
export function Waveform({ active, bars = 12, className }: WaveformProps) {
  const reducedMotion = useReducedMotion();
  return (
    <span aria-hidden className={cn("inline-flex h-4 items-center gap-[2px]", className)}>
      {Array.from({ length: bars }, (_, index) => {
        const peak = HEIGHTS[index % HEIGHTS.length];
        return (
          <motion.span
            key={index}
            className="w-[2px] rounded-full bg-current"
            initial={{ scaleY: 0.2 }}
            animate={
              active && !reducedMotion
                ? { scaleY: [0.2, peak, 0.3, peak * 0.8, 0.2] }
                : { scaleY: active ? peak : 0.2 }
            }
            transition={
              active && !reducedMotion
                ? { duration: 1.1 + (index % 4) * 0.12, repeat: Infinity, ease: "easeInOut", delay: index * 0.05 }
                : { duration: 0.2 }
            }
            style={{ height: "100%", originY: 0.5 }}
          />
        );
      })}
    </span>
  );
}
