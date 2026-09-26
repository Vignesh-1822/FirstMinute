import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { AnimatedNumber, Eyebrow } from "@/components/atoms";
import type { Routing } from "@/types";
import { formatMs } from "@/lib/format";
import { cn } from "@/lib/utils";

interface RecommendationCardProps {
  routing: Routing;
}

/** Recommended destination + the deterministic rule trace that produced it. */
export function RecommendationCard({ routing }: RecommendationCardProps) {
  const { recommended } = routing;
  const alternatives = routing.options.filter((option) => option.hospital.id !== recommended.hospital.id).slice(0, 3);

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Eyebrow>Recommended destination</Eyebrow>
          <motion.div
            key={recommended.hospital.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="mt-1 truncate text-[17px] font-semibold tracking-[-0.01em] text-foreground"
          >
            {recommended.hospital.name}
          </motion.div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="rounded bg-foreground/[0.06] px-1.5 py-0.5 font-mono text-[10px]">{recommended.hospital.level}</span>
            {recommended.thrombectomy_capable ? (
              <span className="rounded bg-foreground/[0.06] px-1.5 py-0.5 text-[10.5px]">Thrombectomy 24/7</span>
            ) : null}
            {routing.lvo_suspected ? (
              <span className="rounded bg-signal-soft px-1.5 py-0.5 text-[10.5px] font-medium text-signal-ink">LVO pathway</span>
            ) : null}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <Eyebrow>ETA</Eyebrow>
          <div className="mt-0.5 flex items-baseline justify-end gap-1">
            <AnimatedNumber value={recommended.eta_minutes} className="text-[30px] leading-none font-medium tracking-tight" />
            <span className="text-xs text-muted-foreground">min</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg well p-2.5">
        <div className="mb-1.5 flex items-center justify-between">
          <Eyebrow>Why · rule trace</Eyebrow>
          <span className="font-mono text-[10px] text-faint">decided in {formatMs(routing.decided_in_ms)}</span>
        </div>
        <ol className="flex flex-col gap-1">
          {routing.rule_trace.map((line, index) => (
            <motion.li
              key={`${index}-${line}`}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05, type: "spring", stiffness: 300, damping: 30 }}
              className={cn(
                "grid grid-cols-[14px_1fr] gap-1.5 font-mono text-[10.5px] leading-[1.45]",
                /^(→|Recommended)/.test(line) ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <span className="text-faint tabular-nums">{index + 1}</span>
              <span>{line}</span>
            </motion.li>
          ))}
        </ol>
      </div>

      {alternatives.length > 0 ? (
        <div className="flex items-center gap-2 overflow-hidden text-[11px] text-muted-foreground">
          <span className="shrink-0">Alternatives</span>
          <ArrowRight className="size-3 shrink-0 text-faint" aria-hidden />
          <span className="truncate">
            {alternatives.map((option, index) => (
              <span key={option.hospital.id} className={cn(!option.eligible && "text-faint line-through")}>
                {index > 0 ? " · " : ""}
                {option.hospital.short_name} <span className="font-mono tabular-nums">{option.eta_minutes}′</span>
              </span>
            ))}
          </span>
        </div>
      ) : null}
    </div>
  );
}
