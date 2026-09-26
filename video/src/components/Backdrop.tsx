import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { color } from "../theme";

type GlowSpec = {
  color: string;
  /** Percent from left. */
  x: number;
  /** Percent from top. */
  y: number;
  /** Radius in px. */
  size: number;
  opacity: number;
};

const GRAIN_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>`,
);

/**
 * Persistent stage underlay: near-black base and a faint, slowly drifting dot grid.
 * Rendered once for the whole film so scene cross-fades never double the grid.
 */
export const StageUnder: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = frame * 0.1;
  return (
    <AbsoluteFill style={{ backgroundColor: color.bg }}>
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(circle, ${color.dot} 1.4px, transparent 1.8px)`,
          backgroundSize: "36px 36px",
          backgroundPosition: `${drift}px ${drift * 0.5}px`,
          maskImage: "radial-gradient(ellipse 75% 70% at 50% 50%, black 30%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 75% 70% at 50% 50%, black 30%, transparent 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

/** Persistent stage overlay: vignette and a very light static grain. */
export const StageOver: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(ellipse 85% 80% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)",
      }}
    />
    <AbsoluteFill
      style={{
        opacity: 0.07,
        mixBlendMode: "overlay",
        backgroundImage: `url("data:image/svg+xml,${GRAIN_SVG}")`,
        backgroundSize: "240px 240px",
      }}
    />
  </AbsoluteFill>
);

type BackdropProps = {
  /** When false, a solid base covers the shared dot grid (used by the cold open). */
  showDots?: boolean;
  glow?: GlowSpec;
  base?: string;
  children?: React.ReactNode;
};

/** Per-scene layer: optional solid base, optional soft glow, then content. */
export const Backdrop: React.FC<BackdropProps> = ({
  showDots = true,
  glow,
  base = color.bgDeep,
  children,
}) => (
  <AbsoluteFill style={{ overflow: "hidden" }}>
    {showDots ? null : <AbsoluteFill style={{ backgroundColor: base }} />}
    {glow ? (
      <AbsoluteFill
        style={{
          opacity: glow.opacity,
          background: `radial-gradient(circle ${glow.size}px at ${glow.x}% ${glow.y}%, ${glow.color}, transparent 70%)`,
        }}
      />
    ) : null}
    <AbsoluteFill>{children}</AbsoluteFill>
  </AbsoluteFill>
);
