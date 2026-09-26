import React from "react";
import { useCurrentFrame } from "remotion";
import { clampMap, progress } from "../lib/anim";
import { color as palette, FONT_MONO } from "../theme";

type DotMatrixPulseProps = {
  /** Frame at which the ripple fires. */
  trigger: number;
  /** Rendered width/height in px. */
  size?: number;
  grid?: number;
  tint?: string;
  /** Show only the diamond silhouette (the app's signature motif). */
  diamond?: boolean;
};

/**
 * The "Jev pulse": a dot-matrix that ripples outward once when a decision lands,
 * then settles into a lit diamond.
 */
export const DotMatrixPulse: React.FC<DotMatrixPulseProps> = ({
  trigger,
  size = 220,
  grid = 11,
  tint = palette.text,
  diamond = true,
}) => {
  const frame = useCurrentFrame();
  const centre = (grid - 1) / 2;
  const maxDistance = centre * 1.5;
  const rippleT = clampMap(frame, [trigger, trigger + 26], [0, 1]);
  const rippleRadius = rippleT * maxDistance;
  const rippleStrength = rippleT > 0 && rippleT < 1 ? 1 - rippleT * 0.6 : 0;
  const settle = progress(frame, trigger + 8, 30);
  const gap = size / grid;
  const dotSize = gap * 0.46;

  const dots: React.ReactNode[] = [];
  for (let row = 0; row < grid; row++) {
    for (let col = 0; col < grid; col++) {
      const dx = col - centre;
      const dy = row - centre;
      const manhattan = Math.abs(dx) + Math.abs(dy);
      if (diamond && manhattan > centre + 0.01) {
        continue;
      }
      const distance = Math.sqrt(dx * dx + dy * dy);
      const wave = Math.exp(-((distance - rippleRadius) ** 2) / 1.2) * rippleStrength;
      const litTarget = manhattan <= centre * 0.55 ? 0.9 : manhattan <= centre * 0.8 ? 0.45 : 0.2;
      const rest = 0.1 + (litTarget - 0.1) * settle;
      const brightness = Math.min(1, rest + wave);
      dots.push(
        <div
          key={`${row}-${col}`}
          style={{
            position: "absolute",
            left: col * gap + (gap - dotSize) / 2,
            top: row * gap + (gap - dotSize) / 2,
            width: dotSize,
            height: dotSize,
            borderRadius: 999,
            backgroundColor: tint,
            opacity: brightness,
            boxShadow: wave > 0.35 ? `0 0 ${dotSize}px ${tint}` : "none",
          }}
        />,
      );
    }
  }

  return <div style={{ position: "relative", width: size, height: size }}>{dots}</div>;
};

type LatencyReadoutProps = {
  trigger: number;
  ms: number;
  fontSize?: number;
};

/** Mono latency that ticks up to its value right after a pulse fires. */
export const LatencyReadout: React.FC<LatencyReadoutProps> = ({ trigger, ms, fontSize = 64 }) => {
  const frame = useCurrentFrame();
  const t = progress(frame, trigger, 18);
  return (
    <div
      style={{
        fontFamily: FONT_MONO,
        fontSize,
        fontWeight: 500,
        color: palette.text,
        fontVariantNumeric: "tabular-nums",
        opacity: clampMap(frame, [trigger - 4, trigger + 4], [0, 1]),
      }}
    >
      {Math.round(ms * t)}
      <span style={{ color: palette.dim, fontSize: fontSize * 0.55, marginLeft: 8 }}>ms</span>
    </div>
  );
};
