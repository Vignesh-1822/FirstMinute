import React from "react";
import { AbsoluteFill } from "remotion";
import { color, FONT_MONO } from "../theme";
import { Backdrop } from "./Backdrop";
import { FadeUp, Headline } from "./Motion";

export const STEPS = ["Talk", "Score", "Ask", "Route", "Alert"] as const;

type StepRailProps = { active: number };

/** Progress rail for the five "how it works" steps. Rendered once, above the steps. */
export const StepRail: React.FC<StepRailProps> = ({ active }) => (
  <div style={{ display: "flex", gap: 10, width: 600 }}>
    {STEPS.map((step, index) => {
      const isActive = index === active;
      const isDone = index < active;
      return (
        <div key={step} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              height: 4,
              borderRadius: 2,
              backgroundColor: isActive ? color.text : isDone ? color.faint : color.hairline,
            }}
          />
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 24,
              color: isActive ? color.text : isDone ? color.dim : color.faint,
            }}
          >
            {step}
          </div>
        </div>
      );
    })}
  </div>
);

type StepLayoutProps = {
  index: number;
  headline: React.ReactNode;
  support: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Layout for the "how it works" steps: text column on the left, a crafted
 * product visual on the right. The progress rail lives in HowItWorks.
 */
export const StepLayout: React.FC<StepLayoutProps> = ({ index, headline, support, children }) => (
  <Backdrop>
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 140,
          top: 0,
          bottom: 0,
          width: 620,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 34,
        }}
      >
        <FadeUp delay={6} duration={26}>
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 28,
              color: color.dim,
              letterSpacing: "0.1em",
            }}
          >
            {String(index + 1).padStart(2, "0")}
            <span style={{ color: color.faint }}> / 05</span>
          </div>
        </FadeUp>
        <FadeUp delay={12} duration={32}>
          <Headline size={68} weight={500}>
            {headline}
          </Headline>
        </FadeUp>
        <FadeUp delay={36} duration={30}>
          <div
            style={{
              fontSize: 38,
              lineHeight: 1.3,
              color: color.muted,
              letterSpacing: "-0.01em",
            }}
          >
            {support}
          </div>
        </FadeUp>
      </div>
      <div
        style={{
          position: "absolute",
          left: 820,
          right: 110,
          top: 80,
          bottom: 80,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  </Backdrop>
);
