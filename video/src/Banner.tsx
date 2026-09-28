import React from "react";
import { AbsoluteFill } from "remotion";
import { StageOver, StageUnder } from "./components/Backdrop";
import { RaceCard } from "./components/Race";
import { Wordmark } from "./components/Wordmark";
import { color, FONT_MONO, FONT_SANS } from "./theme";

/** README / GitHub social-preview banner (1600×640). Export the settled last frame. */
export const Banner: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT_SANS, color: color.text }}>
    <StageUnder />
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle 560px at 24% 50%, ${color.signalGlow}, transparent 70%)`,
        opacity: 0.3,
      }}
    />
    <div
      style={{
        position: "absolute",
        left: 100,
        top: 0,
        bottom: 0,
        width: 760,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 34,
      }}
    >
      <div style={{ fontFamily: FONT_MONO, fontSize: 20, letterSpacing: "0.16em", color: color.signal }}>
        PRE-HOSPITAL STROKE TRIAGE · VOICE FIRST
      </div>
      <Wordmark start={0} size={96} />
      <div style={{ fontSize: 40, lineHeight: 1.22, letterSpacing: "-0.02em", color: color.textSoft }}>
        The first minute decides the stroke.
        <br />
        <span style={{ color: color.text, fontWeight: 500 }}>We make it count.</span>
      </div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 18, letterSpacing: "0.08em", color: color.dim }}>
        JEV SCORES · CODE DECIDES · THE MEDIC CONFIRMS
      </div>
    </div>
    <div style={{ position: "absolute", right: 70, top: 0, bottom: 0, display: "flex", alignItems: "center" }}>
      <div style={{ transform: "scale(0.62)", transformOrigin: "right center" }}>
        <RaceCard start={0} pulseAt={0} width={900} scale={0.82} />
      </div>
    </div>
    <StageOver />
  </AbsoluteFill>
);
