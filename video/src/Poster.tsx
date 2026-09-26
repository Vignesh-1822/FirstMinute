import React from "react";
import { AbsoluteFill } from "remotion";
import { StageOver, StageUnder } from "./components/Backdrop";
import { Citation } from "./components/Motion";
import { RaceCard } from "./components/Race";
import { Wordmark } from "./components/Wordmark";
import { color, FONT_SANS } from "./theme";

/**
 * Poster: wordmark and promise on the left, a RACE card on the right.
 * Registered as a short composition; export its settled last frame as the still.
 */
export const Poster: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT_SANS, color: color.text }}>
    <StageUnder />
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle 760px at 28% 46%, ${color.signalGlow}, transparent 70%)`,
        opacity: 0.35,
      }}
    />
      <div
        style={{
          position: "absolute",
          left: 130,
          top: 0,
          bottom: 0,
          width: 760,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 48,
        }}
      >
        <Wordmark start={0} size={112} />
        <div style={{ fontSize: 50, lineHeight: 1.2, letterSpacing: "-0.02em", color: color.textSoft }}>
          The first minute decides the stroke.
          <br />
          <span style={{ color: color.text, fontWeight: 500 }}>We make it count.</span>
        </div>
        <div style={{ fontSize: 34, lineHeight: 1.35, color: color.muted, maxWidth: 680 }}>
          The medic talks. Jev scores the stroke scale, live status picks the hospital, and the
          stroke team is waiting at the door.
        </div>
        <Citation style={{ fontSize: 22, whiteSpace: "nowrap" }}>Jev · Photon · Browserbase · Stagehand · GMI Cloud</Citation>
      </div>
      <div style={{ position: "absolute", right: 110, top: 0, bottom: 0, display: "flex", alignItems: "center" }}>
        <RaceCard start={0} pulseAt={0} width={900} scale={0.82} />
      </div>
    <StageOver />
  </AbsoluteFill>
);
