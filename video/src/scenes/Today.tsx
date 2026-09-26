import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { Citation, Eyebrow, FadeUp, Headline } from "../components/Motion";
import { breathe, clampMap, fadeOut, progress } from "../lib/anim";
import { color, EASE_IN_OUT, FONT_MONO, FONT_SANS } from "../theme";

const FORM_ROWS = [
  "Facial droop?",
  "Arm drift?",
  "Leg weakness?",
  "Gaze deviation?",
  "Speech / neglect?",
  "Last known well",
  "Blood glucose",
];

const SPLIT = 118;

/** A guided stroke form on a phone: rows get ticked one by one while a timer runs. */
const GuidedForm: React.FC = () => {
  const frame = useCurrentFrame();
  const formProgress = progress(frame, 14, 96, EASE_IN_OUT);
  const seconds = Math.round(formProgress * 118);
  const activeRow = Math.min(FORM_ROWS.length - 1, Math.floor(formProgress * FORM_ROWS.length));
  const tapPhase = (formProgress * FORM_ROWS.length) % 1;

  return (
    <div
      style={{
        width: 560,
        borderRadius: 40,
        padding: 32,
        backgroundColor: color.surface,
        border: `1px solid ${color.hairline}`,
        boxShadow: "0 30px 90px rgba(0,0,0,0.5)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 30, fontWeight: 600, color: color.text }}>Stroke checklist</div>
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 30,
            color: color.uncertain,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
        </div>
      </div>
      <div
        style={{
          marginTop: 18,
          height: 6,
          borderRadius: 3,
          backgroundColor: color.surfaceHigh,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${formProgress * 100}%`,
            height: "100%",
            backgroundColor: color.muted,
          }}
        />
      </div>
      <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 12 }}>
        {FORM_ROWS.map((row, index) => {
          const done = index < activeRow || formProgress >= 1;
          const active = index === activeRow && formProgress < 1;
          return (
            <div
              key={row}
              style={{
                position: "relative",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 18px",
                borderRadius: 14,
                border: `1px solid ${active ? color.hairlineStrong : color.hairline}`,
                backgroundColor: active ? color.surfaceHigh : "transparent",
              }}
            >
              <span style={{ fontSize: 26, color: done || active ? color.textSoft : color.dim }}>
                {row}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                {["Yes", "No"].map((option, optionIndex) => (
                  <span
                    key={option}
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 18,
                      padding: "6px 14px",
                      borderRadius: 999,
                      border: `1px solid ${color.hairlineStrong}`,
                      backgroundColor: done && optionIndex === (index % 3 === 2 ? 1 : 0) ? color.textSoft : "transparent",
                      color: done && optionIndex === (index % 3 === 2 ? 1 : 0) ? color.bg : color.dim,
                    }}
                  >
                    {option}
                  </span>
                ))}
              </div>
              {active ? (
                <div
                  style={{
                    position: "absolute",
                    right: 52,
                    top: "50%",
                    width: 56,
                    height: 56,
                    marginTop: -28,
                    borderRadius: 999,
                    border: `2px solid ${color.text}`,
                    opacity: 0.6 * (1 - tapPhase),
                    transform: `scale(${0.5 + tapPhase * 0.8})`,
                  }}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** Transport timeline: 25 minutes from scene to door, radio only in the last five. */
const TransportTimeline: React.FC<{ start: number }> = ({ start }) => {
  const frame = useCurrentFrame();
  const local = frame - start;
  const travel = progress(local, 10, 80, EASE_IN_OUT);
  const radioReveal = progress(local, 45, 24);
  const trackWidth = 720;
  const radioStart = trackWidth * (20 / 25);
  const waves = breathe(frame, 1.6);

  return (
    <div style={{ width: trackWidth, position: "relative", height: 360 }}>
      <div
        style={{
          position: "absolute",
          left: radioStart + (trackWidth - radioStart) / 2 - 60,
          top: 20,
          width: 120,
          height: 120,
          opacity: radioReveal,
        }}
      >
        <svg width={120} height={120} viewBox="0 0 120 120">
          {[0, 1, 2].map((ring) => (
            <path
              key={ring}
              d={`M ${60 - 18 - ring * 16} ${92 - 18 - ring * 16} A ${26 + ring * 22} ${26 + ring * 22} 0 0 1 ${60 + 18 + ring * 16} ${92 - 18 - ring * 16}`}
              fill="none"
              stroke={color.text}
              strokeWidth={3}
              strokeLinecap="round"
              opacity={0.25 + 0.55 * clampMap(waves * 3 - ring, [0, 1], [0.2, 1])}
            />
          ))}
          <circle cx={60} cy={96} r={7} fill={color.text} />
        </svg>
      </div>
      <div
        style={{
          position: "absolute",
          top: 170,
          left: 0,
          width: trackWidth,
          height: 6,
          borderRadius: 3,
          backgroundColor: color.hairline,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 170,
          left: 0,
          width: trackWidth * travel,
          height: 6,
          borderRadius: 3,
          backgroundColor: color.faint,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 160,
          left: radioStart,
          width: (trackWidth - radioStart) * radioReveal,
          height: 26,
          borderRadius: 6,
          backgroundColor: color.uncertainSoft,
          border: `1px solid ${color.uncertain}`,
          opacity: radioReveal,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 158,
          left: trackWidth * travel - 15,
          width: 30,
          height: 30,
          borderRadius: 8,
          backgroundColor: color.text,
          boxShadow: "0 0 0 6px rgba(250,250,250,0.08)",
        }}
      />
      {[
        { label: "Scene", at: 0, align: "left" as const },
        { label: "Hospital", at: trackWidth, align: "right" as const },
      ].map((stop) => (
        <div
          key={stop.label}
          style={{
            position: "absolute",
            top: 222,
            left: stop.align === "left" ? 0 : undefined,
            right: stop.align === "right" ? 0 : undefined,
            fontSize: 30,
            color: color.muted,
          }}
        >
          {stop.label}
        </div>
      ))}
      {[0, 5, 10, 15, 20, 25].map((minute) => (
        <span
          key={minute}
          style={{
            position: "absolute",
            top: 276,
            left: (minute / 25) * trackWidth,
            transform: `translateX(${minute === 0 ? 0 : minute === 25 ? -100 : -50}%)`,
            fontFamily: FONT_MONO,
            fontSize: 24,
            color: minute >= 20 ? color.uncertain : color.dim,
          }}
        >
          {minute}m
        </span>
      ))}
    </div>
  );
};

/** 3. Today, part one: the guided form, then the late radio call. */
export const TodayForm: React.FC = () => {
  const frame = useCurrentFrame();
  const partA = fadeOut(frame, SPLIT - 8, 18);
  const partB = progress(frame, SPLIT + 2, 22);

  return (
    <Backdrop>
      <div style={{ position: "absolute", left: 140, top: 110 }}>
        <FadeUp delay={4} duration={24}>
          <Eyebrow>Today</Eyebrow>
        </FadeUp>
      </div>

      <AbsoluteFill style={{ opacity: partA }}>
        <div style={{ position: "absolute", left: 180, top: 200 }}>
          <FadeUp delay={8} duration={36} distance={40}>
            <GuidedForm />
          </FadeUp>
        </div>
        <div
          style={{
            position: "absolute",
            left: 920,
            right: 140,
            top: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 30,
          }}
        >
          <FadeUp delay={10} duration={26}>
            <Headline size={72}>A guided form on a phone.</Headline>
          </FadeUp>
          <FadeUp delay={26} duration={26}>
            <div style={{ fontSize: 44, color: color.muted, lineHeight: 1.3, letterSpacing: "-0.01em" }}>
              About two minutes of tapping, mid-transport.
            </div>
          </FadeUp>
          <FadeUp delay={40} duration={24}>
            <Citation>JoinTriage, vendor figure</Citation>
          </FadeUp>
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ opacity: partB }}>
        <div style={{ position: "absolute", left: 140, top: 330 }}>
          <TransportTimeline start={SPLIT} />
        </div>
        <div
          style={{
            position: "absolute",
            left: 1000,
            right: 140,
            top: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 30,
          }}
        >
          <FadeUp delay={SPLIT + 6} duration={26}>
            <Headline size={72}>Then a radio call.</Headline>
          </FadeUp>
          <FadeUp delay={SPLIT + 20} duration={26}>
            <div style={{ fontSize: 44, color: color.muted, lineHeight: 1.3, letterSpacing: "-0.01em" }}>
              Often only in the last five minutes.
            </div>
          </FadeUp>
          <FadeUp delay={SPLIT + 34} duration={24}>
            <Citation>NPSTC report</Citation>
          </FadeUp>
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};

/** One person glyph: head + shoulders, solid or dashed. */
const Person: React.FC<{ dashed: boolean; tint: string }> = ({ dashed, tint }) => (
  <svg width={110} height={150} viewBox="0 0 110 150">
    <circle
      cx={55}
      cy={40}
      r={28}
      fill={dashed ? "none" : tint}
      stroke={tint}
      strokeWidth={dashed ? 3 : 0}
      strokeDasharray={dashed ? "7 7" : undefined}
    />
    <path
      d="M 8 146 C 8 100, 30 82, 55 82 C 80 82, 102 100, 102 146 Z"
      fill={dashed ? "none" : tint}
      stroke={tint}
      strokeWidth={dashed ? 3 : 0}
      strokeDasharray={dashed ? "7 7" : undefined}
    />
  </svg>
);

const GAP_SPLIT = 110;

/** 4. Today, part two: the pre-alert gap, and the honest take on existing tools. */
export const TodayGap: React.FC = () => {
  const frame = useCurrentFrame();
  const partA = fadeOut(frame, GAP_SPLIT - 8, 18);
  const partB = progress(frame, GAP_SPLIT + 2, 20);

  return (
    <Backdrop>
      <div style={{ position: "absolute", left: 140, top: 110 }}>
        <Eyebrow>Today</Eyebrow>
      </div>
      <AbsoluteFill style={{ opacity: partA, alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 110 }}>
          <div style={{ display: "flex", gap: 26 }}>
            {[0, 1, 2].map((index) => (
              <FadeUp key={index} delay={6 + index * 6} duration={26}>
                <Person dashed={index === 2} tint={index === 2 ? color.signal : color.faint} />
              </FadeUp>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <FadeUp delay={12} duration={28}>
              <div
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 180,
                  fontWeight: 500,
                  letterSpacing: "-0.05em",
                  lineHeight: 1,
                  color: color.text,
                }}
              >
                1 in 3
              </div>
            </FadeUp>
            <FadeUp delay={28} duration={26}>
              <div style={{ fontSize: 48, color: color.textSoft, letterSpacing: "-0.02em", maxWidth: 900 }}>
                stroke patients arrive without a pre‑alert.
              </div>
            </FadeUp>
          </div>
        </div>
      </AbsoluteFill>
      <FadeUp
        delay={40}
        duration={24}
        style={{ position: "absolute", left: 140, bottom: 90, opacity: partA }}
      >
        <Citation>GWTG-Stroke registry, 2003–2011</Citation>
      </FadeUp>

      <AbsoluteFill
        style={{
          opacity: partB,
          justifyContent: "center",
          paddingLeft: 220,
          paddingRight: 220,
          gap: 40,
        }}
      >
        <FadeUp delay={GAP_SPLIT + 4} duration={28}>
          <div style={{ fontFamily: FONT_SANS, fontSize: 56, color: color.muted, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            Tools like Pulsara and JoinTriage put the form on a phone.
          </div>
        </FadeUp>
        <FadeUp delay={GAP_SPLIT + 42} duration={30}>
          <Headline size={96} weight={500}>
            The form is still the bottleneck.
          </Headline>
        </FadeUp>
      </AbsoluteFill>
    </Backdrop>
  );
};
