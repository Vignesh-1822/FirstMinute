import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { StageOver, StageUnder } from "./components/Backdrop";
import { color, FONT_MONO, FONT_SANS } from "./theme";

const CALLOUTS: { value: string; label: string }[] = [
  { value: "14", label: "questions in one Jev call" },
  { value: "0", label: "forms for the medic" },
  { value: "1 tap", label: "to pre-alert the team" },
];

/** Portrait card framing a real console screenshot (public/console.png) for social posts (1080×1350). */
export const ConsoleCard: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT_SANS, color: color.text }}>
    <StageUnder />
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle 700px at 50% 55%, ${color.signalGlow}, transparent 70%)`,
        opacity: 0.22,
      }}
    />
    <div
      style={{
        position: "absolute",
        inset: 0,
        padding: "96px 40px 72px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <div style={{ fontFamily: FONT_MONO, fontSize: 24, letterSpacing: "0.16em", color: color.signal }}>
        THE LIVE CONSOLE
      </div>
      <div style={{ marginTop: 28, fontSize: 60, lineHeight: 1.1, letterSpacing: "-0.03em", fontWeight: 500 }}>
        From a spoken report
        <br />
        <span style={{ color: color.textSoft }}>to the right hospital.</span>
      </div>

      <div
        style={{
          marginTop: 64,
          width: 1000,
          borderRadius: 18,
          overflow: "hidden",
          border: `1px solid ${color.hairlineStrong}`,
          boxShadow: `0 40px 120px rgba(0,0,0,0.6), 0 0 0 6px rgba(255,255,255,0.02)`,
        }}
      >
        <Img src={staticFile("console.png")} style={{ width: "100%", display: "block" }} />
      </div>

      <div style={{ marginTop: 64, display: "flex", gap: 20, width: 1000 }}>
        {CALLOUTS.map((callout) => (
          <div
            key={callout.label}
            style={{
              flex: 1,
              padding: "26px 20px",
              borderRadius: 16,
              border: `1px solid ${color.hairline}`,
              backgroundColor: color.surface,
            }}
          >
            <div style={{ fontFamily: FONT_MONO, fontSize: 48, color: color.text }}>{callout.value}</div>
            <div style={{ marginTop: 10, fontSize: 24, lineHeight: 1.3, color: color.muted }}>{callout.label}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "auto", fontFamily: FONT_MONO, fontSize: 22, letterSpacing: "0.08em", color: color.dim }}>
        JEV SCORES · CODE DECIDES · THE MEDIC CONFIRMS
      </div>
    </div>
    <StageOver />
  </AbsoluteFill>
);
