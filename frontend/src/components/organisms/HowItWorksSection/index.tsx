import { motion, useReducedMotion } from "motion/react";
import { CornerMarks, Eyebrow, LevelBar, StatusDot, Waveform } from "@/components/atoms";
import { StepCard } from "@/components/molecules";

function SpeakVisual() {
  return (
    <div className="flex w-[80%] flex-col gap-3">
      <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
        <span className="flex size-7 items-center justify-center rounded-full bg-signal text-white">
          <Waveform active bars={4} className="h-3" />
        </span>
        <Waveform active bars={18} className="h-4 flex-1 text-foreground/60" />
      </div>
      <p className="text-[11.5px] leading-snug text-muted-foreground">
        “…right facial droop, <span className="text-foreground underline decoration-dotted underline-offset-2">can't lift the right arm</span>…”
      </p>
    </div>
  );
}

function ScoreVisual() {
  return (
    <div className="flex w-[82%] flex-col gap-2">
      {[
        { label: "Face", value: 2, levels: 3 },
        { label: "Arm", value: 2, levels: 3 },
      ].map((row) => (
        <div key={row.label} className="grid grid-cols-[44px_1fr_14px] items-center gap-2 text-[11px]">
          <span className="text-muted-foreground">{row.label}</span>
          <LevelBar levels={row.levels} value={row.value} status="confident" />
          <span className="font-mono">{row.value}</span>
        </div>
      ))}
      <div className="mt-1 rounded-md border border-dashed border-uncertain/60 bg-uncertain-soft px-2 py-1.5 text-[11px] text-uncertain-ink">
        Gaze not mentioned — are the eyes deviated?
      </div>
    </div>
  );
}

function StatusVisual() {
  const reducedMotion = useReducedMotion();
  return (
    <div className="flex w-[82%] flex-col divide-y rounded-lg border bg-card text-[11px]">
      {[
        { name: "Mercy", level: "CSC", ok: true },
        { name: "St. Luke's", level: "TSC", ok: false },
        { name: "Riverside", level: "PSC", ok: true },
      ].map((hospital) => (
        <div key={hospital.name} className="flex items-center gap-2 px-2.5 py-1.5">
          {hospital.ok ? (
            <StatusDot tone="confident" />
          ) : (
            <motion.span
              className="size-1.5 rounded-full bg-signal"
              animate={reducedMotion ? undefined : { opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            />
          )}
          <span className="font-medium">{hospital.name}</span>
          <span className="font-mono text-[9.5px] text-faint">{hospital.level}</span>
          <span className="ml-auto font-mono text-[9.5px] text-muted-foreground">{hospital.ok ? "IR ✓" : "IR occupied"}</span>
        </div>
      ))}
      <div className="px-2.5 py-1 font-mono text-[9.5px] text-faint">via Browserbase · 12s ago</div>
    </div>
  );
}

function AlertVisual() {
  return (
    <div className="flex w-[82%] flex-col gap-1.5">
      <span className="text-center text-[10px] font-semibold text-foreground">CODE STROKE · M-14 · ETA 10</span>
      <div className="w-fit rounded-2xl rounded-bl-md border border-signal/50 bg-signal-soft px-2.5 py-1.5 text-[11px]">
        RACE 7/9 · LVO suspected · LKW 40 min
      </div>
      <div className="w-fit rounded-2xl rounded-bl-md bg-muted px-2.5 py-1.5 text-[11px]">S · B · A · R handoff attached</div>
      <span className="text-right text-[9.5px] text-muted-foreground">Delivered</span>
    </div>
  );
}

const STEPS = [
  {
    title: "The medic just talks",
    body: "Voice in the console or a plain iMessage. No form, no taps, no scale to remember.",
    visual: <SpeakVisual />,
  },
  {
    title: "Jev scores, then asks",
    body: "Each RACE item is scored with calibrated confidence. Only missing or shaky items come back as questions.",
    visual: <ScoreVisual />,
  },
  {
    title: "Live hospital status",
    body: "Browserbase and Stagehand read the regional status board. Code applies the routing policy — every step traced.",
    visual: <StatusVisual />,
  },
  {
    title: "CODE STROKE, one tap",
    body: "The medic confirms. Photon opens a group chat with the stroke team and an SBAR handoff from GMI Cloud.",
    visual: <AlertVisual />,
  },
];

export function HowItWorksSection() {
  return (
    <section id="how" className="scroll-mt-14 border-b">
      <div className="relative mx-auto max-w-[1200px] border-x">
        <CornerMarks corners={["bl", "br"]} />
        <div className="border-b px-6 py-14 md:px-10">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-3 max-w-[22ch] text-[34px] leading-[1.05] font-semibold tracking-[-0.03em]">
            They digitised the form. We removed it.
          </h2>
        </div>
        <div className="grid divide-y md:grid-cols-2 md:divide-y-0 lg:grid-cols-4 lg:divide-x">
          {STEPS.map((step, index) => (
            <StepCard key={step.title} step={`0${index + 1}`} title={step.title} body={step.body} visual={step.visual} />
          ))}
        </div>
      </div>
    </section>
  );
}
