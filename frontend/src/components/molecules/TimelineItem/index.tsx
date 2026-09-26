import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import type { TimelineEvent } from "@/types";
import { formatMs, formatOffset } from "@/lib/format";
import { cn } from "@/lib/utils";

interface TimelineItemProps {
  event: TimelineEvent;
  icon: LucideIcon;
  kindLabel: string;
  latest: boolean;
}

/** One stop on the bottom timeline rail. */
export function TimelineItem({ event, icon: Icon, kindLabel, latest }: TimelineItemProps) {
  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="relative flex w-[184px] shrink-0 flex-col gap-1 pt-3 pr-4"
      title={event.detail ?? event.label}
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-0 left-0 size-[7px] -translate-y-1/2 rounded-full border",
          latest ? "border-signal bg-signal" : "border-border-strong bg-card",
        )}
      />
      <div className="flex items-center gap-1.5">
        <Icon className="size-3 text-muted-foreground" strokeWidth={1.5} aria-hidden />
        <span className="sr-only">{kindLabel}</span>
        <span className="font-mono text-[10.5px] tabular-nums text-foreground">{formatOffset(event.t_ms)}</span>
        {event.latency_ms !== null ? (
          <span className="ml-auto font-mono text-[10px] tabular-nums text-faint">{formatMs(event.latency_ms)}</span>
        ) : null}
      </div>
      <span className="truncate text-[11.5px] text-foreground/90">{event.label}</span>
      {event.detail ? <span className="truncate text-[10.5px] text-muted-foreground">{event.detail}</span> : null}
    </motion.li>
  );
}
