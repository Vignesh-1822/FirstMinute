import { AnimatePresence, motion } from "motion/react";
import { DotMatrix } from "@/components/atoms";
import { formatMs } from "@/lib/format";
import { cn } from "@/lib/utils";

interface JevPulseProps {
  /** Changes on every new Jev decision (e.g. assessment.computed_at). */
  pulseKey: string | null;
  latencyMs: number | null;
  thinking: boolean;
  className?: string;
}

/** Dot-matrix "Jev pulse": ripples once per decision and shows its latency. */
export function JevPulse({ pulseKey, latencyMs, thinking, className }: JevPulseProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)} aria-live="polite">
      <DotMatrix
        size={26}
        pattern="diamond"
        mode={thinking && !pulseKey ? "loading" : "pulse"}
        pulseKey={pulseKey}
        restOpacity={0.3}
        className="text-foreground"
        label="Jev decision pulse"
      />
      <div className="flex flex-col leading-none">
        <span className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Jev</span>
        <span className="relative mt-1 h-4 w-[58px] overflow-hidden font-mono text-[13px] tabular-nums text-foreground">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={pulseKey ?? "idle"}
              className="absolute inset-0"
              initial={{ y: 10, opacity: 0, filter: "blur(2px)" }}
              animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
              exit={{ y: -10, opacity: 0, filter: "blur(2px)" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {latencyMs === null ? "– ms" : formatMs(latencyMs)}
            </motion.span>
          </AnimatePresence>
        </span>
      </div>
    </div>
  );
}
