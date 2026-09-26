import { motion } from "motion/react";
import { AnimatedNumber, Eyebrow } from "@/components/atoms";
import type { Assessment } from "@/types";
import { formatLkw, toNumberOrNull } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ScoreSummaryProps {
  assessment: Assessment | null;
  maxScore: number;
  scaleName: string;
}

const SIDE_COPY: Record<string, string> = {
  left: "Left",
  right: "Right",
  bilateral: "Bilateral",
  none_reported: "Not reported",
};

function Fact({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div className="flex flex-col gap-1">
      <Eyebrow>{label}</Eyebrow>
      <span className={cn("font-mono text-[13px] tabular-nums", tone === "warn" ? "text-signal-ink" : "text-foreground")}>{value}</span>
    </div>
  );
}

/** Big mono total + interpretation + code-extracted facts (LKW, glucose, weak side). */
export function ScoreSummary({ assessment, maxScore, scaleName }: ScoreSummaryProps) {
  const total = assessment?.total ?? null;
  const severity = assessment?.interpretation.severity ?? "low";
  const lkw = toNumberOrNull(assessment?.extracted.lkw_minutes);
  const glucose = toNumberOrNull(assessment?.extracted.glucose);
  const side = assessment?.extracted.weak_side;
  const lvo = severity === "high";

  return (
    <div className="flex items-end gap-6">
      <div className="flex flex-col gap-1.5">
        <Eyebrow>{scaleName} total</Eyebrow>
        <div className="flex items-baseline gap-1 leading-none">
          {total === null ? (
            <span className="font-mono text-[56px] font-medium tracking-tight text-faint">–</span>
          ) : (
            <AnimatedNumber
              value={total}
              className={cn("text-[56px] font-medium tracking-tight", lvo ? "text-signal-ink" : "text-foreground")}
            />
          )}
          <span className="font-mono text-2xl text-faint">/{maxScore}</span>
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-3 pb-1.5">
        <motion.span
          key={assessment?.interpretation.label ?? "none"}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={cn(
            "inline-flex h-7 w-fit items-center gap-2 rounded-md px-2.5 text-[13px] font-medium",
            lvo && "bg-signal text-white shadow-[inset_0_1px_0_oklch(1_0_0/0.25)]",
            severity === "moderate" && "bg-uncertain-soft text-uncertain-ink",
            severity === "low" && "border bg-muted/60 text-muted-foreground",
          )}
        >
          {lvo ? <span className="size-1.5 rounded-full bg-white" aria-hidden /> : null}
          {assessment ? assessment.interpretation.label : "Awaiting report"}
        </motion.span>
        <div className="flex gap-6">
          <Fact label="LKW" value={assessment ? formatLkw(lkw) : "–"} />
          <Fact label="Glucose" value={glucose === null ? "–" : `${glucose} mg/dL`} tone={glucose !== null && glucose < 60 ? "warn" : undefined} />
          <Fact label="Weak side" value={typeof side === "string" ? (SIDE_COPY[side] ?? side) : "–"} />
        </div>
      </div>
    </div>
  );
}
