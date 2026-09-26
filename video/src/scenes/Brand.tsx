import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { FadeUp } from "../components/Motion";
import { Wordmark } from "../components/Wordmark";
import { fadeOut, progress } from "../lib/anim";
import { color } from "../theme";

/** 5. Reveal: the name, and the promise. */
export const Reveal: React.FC = () => {
  const frame = useCurrentFrame();
  const glow = progress(frame, 0, 60) * 0.5;
  return (
    <Backdrop glow={{ color: color.signalGlow, x: 50, y: 42, size: 900, opacity: glow * 0.5 }}>
      <AbsoluteFill
        style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 70 }}
      >
        <Wordmark start={6} size={160} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <FadeUp delay={40} duration={28}>
            <div style={{ fontSize: 52, color: color.textSoft, letterSpacing: "-0.02em" }}>
              The first minute decides the stroke.
            </div>
          </FadeUp>
          <FadeUp delay={58} duration={28}>
            <div style={{ fontSize: 52, color: color.text, fontWeight: 500, letterSpacing: "-0.02em" }}>
              We make it count.
            </div>
          </FadeUp>
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};

/** 12. Close: the name again, the stakes, then fade to black. */
export const Close: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeToBlack = 1 - fadeOut(frame, 112, 36);
  return (
    <Backdrop glow={{ color: color.signalGlow, x: 50, y: 40, size: 900, opacity: 0.22 }}>
      <AbsoluteFill
        style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 70 }}
      >
        <Wordmark start={4} size={132} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <FadeUp delay={26} duration={28}>
            <div style={{ fontSize: 52, color: color.textSoft, letterSpacing: "-0.02em" }}>
              Every minute is 1.9 million neurons.
            </div>
          </FadeUp>
          <FadeUp delay={44} duration={28}>
            <div style={{ fontSize: 52, color: color.text, fontWeight: 500, letterSpacing: "-0.02em" }}>
              Give them back.
            </div>
          </FadeUp>
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: "#000", opacity: fadeToBlack }} />
    </Backdrop>
  );
};
