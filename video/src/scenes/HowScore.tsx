import React from "react";
import { useCurrentFrame } from "remotion";
import { DotMatrixPulse, LatencyReadout } from "../components/DotMatrix";
import { FadeUp } from "../components/Motion";
import { RACE_ITEMS, RaceCard, RaceRow } from "../components/Race";
import { StepLayout } from "../components/StepLayout";
import { breathe, clampMap, progress } from "../lib/anim";
import { color, FONT_MONO, FONT_SANS } from "../theme";

/** Step 2: Jev scores the stroke scale in milliseconds. */
export const HowScore: React.FC = () => (
  <StepLayout
    index={1}
    headline={<>Jev scores<br />the stroke scale<br />in milliseconds.</>}
    support="Every item gets a score and a confidence."
  >
    <FadeUp delay={8} duration={30} distance={40}>
      <RaceCard start={38} pulseAt={30} />
    </FadeUp>
  </StepLayout>
);

type ChatLineProps = {
  appearAt: number;
  side: "left" | "right";
  author: string;
  children: React.ReactNode;
};

const ChatLine: React.FC<ChatLineProps> = ({ appearAt, side, author, children }) => {
  const frame = useCurrentFrame();
  const enter = progress(frame, appearAt, 26);
  const outgoing = side === "right";
  return (
    <div
      style={{
        alignSelf: outgoing ? "flex-end" : "flex-start",
        opacity: enter,
        transform: `translateY(${(1 - enter) * 22}px)`,
        display: "flex",
        flexDirection: "column",
        alignItems: outgoing ? "flex-end" : "flex-start",
        gap: 8,
        maxWidth: 720,
      }}
    >
      <span style={{ fontFamily: FONT_MONO, fontSize: 22, color: color.dim }}>{author}</span>
      <div
        style={{
          padding: "18px 28px",
          borderRadius: 28,
          borderBottomLeftRadius: outgoing ? 28 : 8,
          borderBottomRightRadius: outgoing ? 8 : 28,
          backgroundColor: outgoing ? "#ededed" : color.surfaceHigh,
          border: outgoing ? "none" : `1px solid ${color.hairline}`,
          color: outgoing ? color.bg : color.text,
          fontFamily: FONT_SANS,
          fontSize: 36,
          lineHeight: 1.3,
          letterSpacing: "-0.01em",
        }}
      >
        {children}
      </div>
    </div>
  );
};

const ASK_AT = 56;
const ANSWER_AT = 108;
const RESOLVE_AT = 134;

/** Step 3: when unsure, it asks only for what is missing. */
export const HowAsk: React.FC = () => {
  const frame = useCurrentFrame();
  const resolved = frame >= RESOLVE_AT;
  const fill = progress(frame, RESOLVE_AT, 30);
  const flag = progress(frame, 30, 24) * (1 - progress(frame, RESOLVE_AT, 20));
  const confirmGlow = progress(frame, RESOLVE_AT, 14) * (1 - progress(frame, RESOLVE_AT + 30, 40));
  const knownTotal = RACE_ITEMS.filter((item) => item.id !== "gaze").reduce((s, i) => s + i.value, 0);
  const total = knownTotal + (resolved ? Math.round(fill) : 0);

  return (
    <StepLayout
      index={2}
      headline="Unsure? It asks — only what's missing."
      support="Four items were clear. One was never mentioned."
    >
      <div style={{ width: 960, display: "flex", flexDirection: "column", gap: 36 }}>
        <FadeUp delay={8} duration={28} distance={30}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {RACE_ITEMS.map((item) => {
              const isGaze = item.id === "gaze";
              if (!isGaze) {
                return (
                  <div key={item.id} style={{ opacity: 0.45 }}>
                    <RaceRow
                      label={item.label}
                      max={item.max}
                      value={item.value}
                      fill={1}
                      status="confident"
                      probabilities={item.probabilities}
                      width={960}
                      scale={0.8}
                    />
                  </div>
                );
              }
              return (
                <div key={item.id} style={{ position: "relative" }}>
                  <RaceRow
                    label={item.label}
                    max={item.max}
                    value={resolved ? item.value : 0}
                    fill={resolved ? fill : 0}
                    status={resolved ? "confident" : "missing"}
                    probabilities={resolved ? item.probabilities.map((p) => p * fill) : [0.5, 0.5]}
                    width={960}
                    scale={0.8}
                    highlight={Math.max(confirmGlow, 0)}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: -6,
                      borderRadius: 18,
                      border: `2px solid ${color.uncertain}`,
                      opacity: flag * (0.55 + 0.45 * breathe(frame, 2.2)),
                      pointerEvents: "none",
                    }}
                  />
                </div>
              );
            })}
          </div>
        </FadeUp>

        <div style={{ display: "flex", flexDirection: "column", gap: 22, minHeight: 300 }}>
          <ChatLine appearAt={ASK_AT} side="left" author="FirstMinute">
            Gaze not mentioned — are the eyes deviated to one side?
          </ChatLine>
          <ChatLine appearAt={ANSWER_AT} side="right" author="Medic · M-14">
            Yes, eyes deviated to the right.
          </ChatLine>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            opacity: progress(frame, 16, 24),
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
            <span style={{ fontFamily: FONT_MONO, fontSize: 24, color: color.dim }}>TOTAL</span>
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 60,
                fontWeight: 500,
                color: color.text,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {total}
              <span style={{ color: color.dim, fontSize: 34 }}>/9</span>
            </span>
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 24,
                color: resolved ? color.confident : color.uncertain,
                marginLeft: 12,
              }}
            >
              {resolved ? "complete" : "1 item open"}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              opacity: clampMap(frame, [RESOLVE_AT - 6, RESOLVE_AT + 4], [0, 1]),
            }}
          >
            <DotMatrixPulse trigger={RESOLVE_AT} size={60} grid={9} />
            <LatencyReadout trigger={RESOLVE_AT} ms={118} fontSize={40} />
          </div>
        </div>
      </div>
    </StepLayout>
  );
};
