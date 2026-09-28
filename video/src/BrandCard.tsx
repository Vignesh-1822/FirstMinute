import React from "react";
import { AbsoluteFill } from "remotion";
import { StageOver, StageUnder } from "./components/Backdrop";
import { RaceCard } from "./components/Race";
import { Wordmark } from "./components/Wordmark";
import { color, FONT_MONO, FONT_SANS } from "./theme";

/**
 * Portrait brand card for social posts (1080×1350).
 * Registered as a short composition; export its settled last frame as the still.
 */
export const BrandCard: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT_SANS, color: color.text }}>
    <StageUnder />
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle 620px at 50% 30%, ${color.signalGlow}, transparent 70%)`,
        opacity: 0.32,
      }}
    />
    <div
      style={{
        position: "absolute",
        inset: 0,
        padding: "80px 90px 64px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 14,
          padding: "12px 24px",
          borderRadius: 999,
          border: `1px solid ${color.signalGlow}`,
          backgroundColor: color.signalSoft,
          fontFamily: FONT_MONO,
          fontSize: 24,
          letterSpacing: "0.14em",
          color: color.signal,
        }}
      >
        <span style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: color.signal }} />
        TOP 5 FINISH · HACKATHON 2026
      </div>

      <div style={{ marginTop: 52 }}>
        <Wordmark start={0} size={104} />
      </div>

      <div style={{ marginTop: 36, fontSize: 50, lineHeight: 1.18, letterSpacing: "-0.025em", color: color.textSoft }}>
        The first minute decides the stroke.
        <br />
        <span style={{ color: color.text, fontWeight: 500 }}>We make it count.</span>
      </div>


      <div style={{ marginTop: 52, textAlign: "left" }}>
        <RaceCard start={0} pulseAt={0} width={860} scale={0.8} />
      </div>

      <div
        style={{
          marginTop: "auto",
          fontFamily: FONT_MONO,
          fontSize: 22,
          letterSpacing: "0.08em",
          color: color.dim,
        }}
      >
        BUILT WITH JEV BY TYPESAFE · PHOTON
      </div>
    </div>
    <StageOver />
  </AbsoluteFill>
);
