import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { AnimatedNumber, DotMatrix, Eyebrow, LevelBar, StatusChip } from "@/components/atoms";
import { cn } from "@/lib/utils";

const WORDS =
  "68 year old male, last known well 40 minutes ago. Obvious right facial droop. Right arm, no effort against gravity. Right leg drifts. Eyes deviated to the left. Won't make a fist, not getting words out.".split(
    " ",
  );

const ITEMS = [
  { id: "face", label: "Facial palsy", levels: 3, value: 2, at: 12 },
  { id: "arm", label: "Arm motor", levels: 3, value: 2, at: 19 },
  { id: "leg", label: "Leg motor", levels: 3, value: 1, at: 22 },
  { id: "gaze", label: "Head & gaze", levels: 2, value: 1, at: 27 },
  { id: "cortical", label: "Aphasia", levels: 3, value: 1, at: 34 },
];

const TOTAL_TICKS = WORDS.length + 14;

/** Looping, self-contained miniature of the console for the hero. */
export function HeroConsolePreview() {
  const reducedMotion = useReducedMotion();
  const [tick, setTick] = useState(reducedMotion ? TOTAL_TICKS - 1 : 0);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = setInterval(() => setTick((value) => (value + 1) % TOTAL_TICKS), 260);
    return () => clearInterval(timer);
  }, [reducedMotion]);

  const shown = Math.min(tick, WORDS.length);
  const done = tick >= WORDS.length;
  const total = ITEMS.reduce((sum, item) => sum + (shown >= item.at ? item.value : 0), 0);
  const routed = tick >= WORDS.length + 3;

  return (
    <div className="surface relative w-full max-w-[520px] overflow-hidden rounded-2xl" aria-label="FirstMinute console preview" role="img">
      <div className="flex h-10 items-center gap-2 border-b px-4">
        <span className="size-2 rounded-full bg-foreground/15" />
        <span className="size-2 rounded-full bg-foreground/15" />
        <span className="size-2 rounded-full bg-foreground/15" />
        <span className="ml-3 font-mono text-[11px] text-muted-foreground">FM-2401 · Unit M-14</span>
        <span className={cn("ml-auto text-[11px]", done ? "text-muted-foreground" : "shimmer-text")}>
          {done ? "Report final" : "Listening"}
        </span>
      </div>

      <div className="border-b px-4 py-3">
        <p className="h-[60px] overflow-hidden text-[12.5px] leading-[1.6] text-foreground/85">
          {WORDS.slice(Math.max(0, shown - 22), shown).join(" ")}
          {!done ? <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-blink bg-signal" /> : null}
        </p>
      </div>

      <div className="divide-y">
        {ITEMS.map((item) => {
          const known = shown >= item.at;
          return (
            <div key={item.id} className="grid grid-cols-[110px_1fr_76px] items-center gap-4 px-4 py-2">
              <span className="text-[12.5px] font-medium text-foreground">{item.label}</span>
              <div className="flex items-center gap-2">
                <span className="w-2 font-mono text-[13px] tabular-nums">{known ? item.value : "–"}</span>
                <LevelBar levels={item.levels} value={known ? item.value : null} status={known ? "confident" : "missing"} />
              </div>
              <div className="flex justify-end">
                <StatusChip status={known ? "confident" : "missing"} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 border-t px-4 py-3">
        <div className="flex items-baseline gap-1">
          <AnimatedNumber value={total} className={cn("text-[34px] leading-none font-medium", total >= 5 ? "text-signal-ink" : "text-foreground")} />
          <span className="font-mono text-base text-faint">/9</span>
        </div>
        <div className="min-w-0 flex-1">
          <Eyebrow>RACE</Eyebrow>
          <motion.div
            animate={{ opacity: routed ? 1 : 0.35 }}
            className="truncate text-[12.5px] text-foreground"
          >
            {routed ? (
              <>
                → <span className="font-medium">Mercy General</span> · ETA <span className="font-mono">10′</span>
                <span className="text-muted-foreground"> · St. Luke's: angio occupied</span>
              </>
            ) : (
              "Routing waits for the final report"
            )}
          </motion.div>
        </div>
        <DotMatrix size={24} mode="pulse" pulseKey={shown} className="text-foreground" />
      </div>
    </div>
  );
}
