import { useEffect, useRef } from "react";
import { Eyebrow } from "@/components/atoms";
import { TimelineItem } from "@/components/molecules";
import type { Case } from "@/types";
import { formatOffset } from "@/lib/format";
import { TIMELINE_KINDS } from "@/lib/timelineKinds";

interface TimelineRailProps {
  caseData: Case | undefined;
}

export function TimelineRail({ caseData }: TimelineRailProps) {
  const events = caseData?.timeline ?? [];
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTo({ left: element.scrollWidth, behavior: "smooth" });
  }, [events.length]);

  const last = events.at(-1);

  return (
    <footer className="flex h-[84px] shrink-0 items-stretch border-t bg-background">
      <div className="flex w-[148px] shrink-0 flex-col justify-center gap-1 border-r px-4">
        <Eyebrow>Timeline</Eyebrow>
        <span className="font-mono text-[15px] tabular-nums text-foreground">{last ? formatOffset(last.t_ms) : "t+0.000s"}</span>
        <span className="text-[10.5px] text-muted-foreground">{events.length} events</span>
      </div>
      <div ref={scrollRef} className="relative min-w-0 flex-1 overflow-x-auto scrollbar-none">
        {events.length === 0 ? (
          <p className="flex h-full items-center px-5 text-[12px] text-muted-foreground">
            Every Jev decision, routing step, status check and message lands here with a millisecond stamp.
          </p>
        ) : (
          <ol className="relative mt-4 ml-5 flex w-max border-t border-border-strong pr-8" aria-label="Case timeline">
            {events.map((event, index) => {
              const kind = TIMELINE_KINDS[event.kind] ?? TIMELINE_KINDS.medic;
              return (
                <TimelineItem
                  key={`${event.at}-${index}`}
                  event={event}
                  icon={kind.icon}
                  kindLabel={kind.label}
                  latest={index === events.length - 1}
                />
              );
            })}
          </ol>
        )}
      </div>
    </footer>
  );
}
