import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { Citation, Eyebrow, FadeUp, Headline } from "../components/Motion";
import { progress } from "../lib/anim";
import { color, EASE_IN_OUT, FONT_MONO, FONT_SANS } from "../theme";

const BAR_MAX = 1180;

type SpeedBarProps = {
  label: string;
  value: string;
  detail: string;
  share: number;
  start: number;
  tint: string;
  emphasis: boolean;
};

const SpeedBar: React.FC<SpeedBarProps> = ({ label, value, detail, share, start, tint, emphasis }) => {
  const frame = useCurrentFrame();
  const grow = progress(frame, start, 70, EASE_IN_OUT);
  const textIn = progress(frame, start + 30, 30);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 24 }}>
        <span style={{ fontSize: 44, fontWeight: 500, color: emphasis ? color.text : color.muted, width: 340 }}>
          {label}
        </span>
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 56,
            fontWeight: 500,
            color: emphasis ? color.text : color.textSoft,
            opacity: textIn,
          }}
        >
          {value}
        </span>
        <span style={{ fontSize: 36, color: color.dim, opacity: textIn }}>{detail}</span>
      </div>
      <div
        style={{
          width: BAR_MAX,
          height: 30,
          borderRadius: 8,
          backgroundColor: color.surface,
          border: `1px solid ${color.hairline}`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: Math.max(16, BAR_MAX * share * grow),
            height: "100%",
            borderRadius: 8,
            backgroundColor: tint,
            opacity: grow > 0 ? 1 : 0,
          }}
        />
      </div>
    </div>
  );
};

/** 7. Speed: from minutes to seconds. */
export const Speed: React.FC = () => (
  <Backdrop>
    <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 370, gap: 80 }}>
      <FadeUp delay={8} duration={32}>
        <Headline size={88}>From minutes to seconds.</Headline>
      </FadeUp>
      <FadeUp delay={30} duration={30}>
        <SpeedBar
          label="Today"
          value="2–5 min"
          detail="forms and calls"
          share={1}
          start={40}
          tint={color.faint}
          emphasis={false}
        />
      </FadeUp>
      <FadeUp delay={62} duration={30}>
        <SpeedBar
          label="FirstMinute"
          value="seconds"
          detail="speak, confirm, done"
          share={0.03}
          start={80}
          tint={color.text}
          emphasis
        />
      </FadeUp>
    </AbsoluteFill>
    <FadeUp delay={130} duration={30} style={{ position: "absolute", left: 370, bottom: 110 }}>
      <Citation style={{ fontSize: 28 }}>Each Jev decision takes ~100–400 ms (independent benchmarks).</Citation>
    </FadeUp>
  </Backdrop>
);

/** 8. Impact: the right hospital first time. */
export const Impact: React.FC = () => {
  const frame = useCurrentFrame();
  const count = Math.round(progress(frame, 16, 60, EASE_IN_OUT) * 119);
  return (
    <Backdrop glow={{ color: color.signalGlow, x: 30, y: 50, size: 700, opacity: 0.25 }}>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 90 }}>
          <FadeUp delay={10} duration={34}>
            <div
              style={{
                fontFamily: FONT_MONO,
                fontSize: 230,
                fontWeight: 500,
                letterSpacing: "-0.05em",
                color: color.text,
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
                whiteSpace: "nowrap",
              }}
            >
              {count}
              <span style={{ fontSize: 90, color: color.muted, marginLeft: 18, letterSpacing: "-0.02em" }}>min</span>
            </div>
          </FadeUp>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <FadeUp delay={44} duration={34}>
              <div style={{ fontSize: 54, color: color.text, letterSpacing: "-0.02em", lineHeight: 1.18, fontWeight: 500 }}>
                sooner to clot removal
              </div>
            </FadeUp>
            <FadeUp delay={70} duration={34}>
              <div style={{ fontSize: 44, color: color.muted, letterSpacing: "-0.02em", lineHeight: 1.25 }}>
                when the first hospital is the right one.
              </div>
            </FadeUp>
          </div>
        </div>
      </AbsoluteFill>
      <FadeUp delay={100} duration={30} style={{ position: "absolute", left: 220, bottom: 90 }}>
        <Citation>Direct-to-thrombectomy routing vs. transfer · Maryland pilot</Citation>
      </FadeUp>
    </Backdrop>
  );
};

const SAFETY: { line: string; note: string }[] = [
  { line: "Jev scores.", note: "with calibrated confidence" },
  { line: "Code decides.", note: "routing rules in one config" },
  { line: "The medic confirms.", note: "always a human in the loop" },
];

/** 9. Safety: who does what. */
export const Safety: React.FC = () => (
  <Backdrop>
    <div style={{ position: "absolute", left: 300, top: 150 }}>
      <FadeUp delay={4} duration={26}>
        <Eyebrow accent={color.confident}>Safe by design</Eyebrow>
      </FadeUp>
    </div>
    <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 300, gap: 56, paddingTop: 60 }}>
      {SAFETY.map((item, index) => (
        <FadeUp key={item.line} delay={16 + index * 34} duration={34}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 48 }}>
            <Headline size={96} weight={500} style={{ width: 860 }}>
              {item.line}
            </Headline>
            <span style={{ fontFamily: FONT_MONO, fontSize: 30, color: color.dim }}>{item.note}</span>
          </div>
        </FadeUp>
      ))}
    </AbsoluteFill>
  </Backdrop>
);

type PackCardProps = {
  tag: string;
  title: string;
  items: string[];
  state: "live" | "next";
  delay: number;
  accent: string;
};

const PackCard: React.FC<PackCardProps> = ({ tag, title, items, state, delay, accent }) => (
  <FadeUp delay={delay} duration={34} distance={40}>
    <div
      style={{
        width: 360,
        height: 360,
        borderRadius: 22,
        padding: 32,
        border: `1px ${state === "live" ? "solid" : "dashed"} ${state === "live" ? color.hairlineStrong : color.faint}`,
        backgroundColor: state === "live" ? color.surface : "transparent",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        boxShadow: state === "live" ? "inset 0 1px 0 rgba(255,255,255,0.05)" : "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 22, color: color.dim }}>{tag}</span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontFamily: FONT_MONO,
            fontSize: 20,
            color: state === "live" ? color.confident : color.dim,
          }}
        >
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: 999,
              backgroundColor: state === "live" ? color.confident : "transparent",
              border: state === "live" ? "none" : `1.5px dashed ${color.faint}`,
            }}
          />
          {state === "live" ? "built" : "next"}
        </span>
      </div>
      <div style={{ fontFamily: FONT_SANS, fontSize: 44, fontWeight: 600, letterSpacing: "-0.03em", color: color.text, lineHeight: 1.05 }}>
        {title}
      </div>
      <div style={{ height: 4, width: 56, borderRadius: 2, backgroundColor: accent }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: "auto" }}>
        {items.map((item) => (
          <span key={item} style={{ fontFamily: FONT_MONO, fontSize: 22, color: color.muted }}>
            {item}
          </span>
        ))}
      </div>
    </div>
  </FadeUp>
);

/** 10. Beyond stroke: protocol packs on the same engine. */
export const Beyond: React.FC = () => (
  <Backdrop>
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 80 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        <FadeUp delay={8} duration={32}>
          <Headline size={88}>Same reflex. Any protocol.</Headline>
        </FadeUp>
      </div>
      <div style={{ display: "flex", gap: 36 }}>
        <PackCard tag="PACK 01" title="Stroke" items={["RACE scale", "live routing", "CODE STROKE"]} state="live" delay={40} accent={color.signal} />
        <PackCard tag="PACK 02" title="9-Line MEDEVAC" items={["9 lines", "readback", "evac card"]} state="live" delay={54} accent={color.text} />
        <PackCard tag="PACK 03" title="STEMI" items={["ECG findings", "cath lab", "pre-alert"]} state="next" delay={68} accent={color.faint} />
        <PackCard tag="PACK 04" title="Trauma" items={["field triage", "trauma level", "team call"]} state="next" delay={82} accent={color.faint} />
      </div>
    </AbsoluteFill>
  </Backdrop>
);

const SPONSORS: { name: string; role: string }[] = [
  { name: "Jev by TypeSafe", role: "scores every item" },
  { name: "Photon", role: "iMessage group alerts" },
  { name: "Browserbase", role: "headless browser sessions" },
  { name: "Stagehand", role: "reads live hospital status" },
  { name: "GMI Cloud", role: "writes the SBAR handoff" },
  { name: "CodeRabbit", role: "AI code review" },
];

/** 11. Built with: typographic lockup, text wordmarks only. */
export const BuiltWith: React.FC = () => (
  <Backdrop>
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 90 }}>
      <FadeUp delay={6} duration={28}>
        <Eyebrow>Built with</Eyebrow>
      </FadeUp>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 440px)",
          columnGap: 60,
          rowGap: 80,
        }}
      >
        {SPONSORS.map((sponsor, index) => (
          <FadeUp key={sponsor.name} delay={18 + index * 7} duration={32}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, borderTop: `1px solid ${color.hairline}`, paddingTop: 26 }}>
              <span style={{ fontFamily: FONT_SANS, fontSize: 52, fontWeight: 600, letterSpacing: "-0.035em", color: color.text }}>
                {sponsor.name}
              </span>
              <span style={{ fontFamily: FONT_MONO, fontSize: 24, color: color.dim }}>{sponsor.role}</span>
            </div>
          </FadeUp>
        ))}
      </div>
    </AbsoluteFill>
  </Backdrop>
);
