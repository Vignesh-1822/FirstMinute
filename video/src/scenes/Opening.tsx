import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { Citation, FadeUp, Headline } from "../components/Motion";
import { breathe, clampMap, formatThousands, progress } from "../lib/anim";
import { color, EASE_IN_OUT, FONT_MONO, type } from "../theme";

/** 1. Cold open: a counter of brain cells lost, one soft red pulse behind it. */
export const ColdOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const count = progress(frame, 18, 84, EASE_IN_OUT) * 1_900_000;
  const glowIn = progress(frame, 0, 60);
  const glowOpacity = glowIn * (0.4 + 0.25 * breathe(frame, 3.2));

  return (
    <Backdrop
      showDots={false}
      base={color.bgDeep}
      glow={{ color: color.signalGlow, x: 50, y: 44, size: 720, opacity: glowOpacity }}
    >
      <AbsoluteFill
        style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 40 }}
      >
        <FadeUp delay={6} duration={30} blur={14}>
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 200,
              fontWeight: 500,
              letterSpacing: "-0.04em",
              color: color.text,
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
            }}
          >
            {formatThousands(count)}
          </div>
        </FadeUp>
        <FadeUp delay={72} duration={36}>
          <div
            style={{
              fontSize: 54,
              fontWeight: 400,
              color: color.textSoft,
              letterSpacing: "-0.02em",
              textAlign: "center",
              lineHeight: 1.25,
            }}
          >
            brain cells lost every minute
            <br />
            <span style={{ color: color.muted }}>a stroke goes untreated.</span>
          </div>
        </FadeUp>
      </AbsoluteFill>
      <FadeUp delay={110} duration={30} style={{ position: "absolute", left: 140, bottom: 90 }}>
        <Citation>Saver, Stroke 2006</Citation>
      </FadeUp>
    </Backdrop>
  );
};

const QUESTIONS = [
  "Is it a major stroke?",
  "Which hospital can treat it?",
  "Is the team ready at the door?",
];

/** 2. The moment: three decisions, minutes to make them. */
export const Moment: React.FC = () => {
  const frame = useCurrentFrame();
  const settle = progress(frame, 96, 40);
  const headerTop = clampMap(settle, [0, 1], [470, 200]);
  const headerScale = clampMap(settle, [0, 1], [1, 0.6]);
  const headerColour = settle > 0.5 ? color.muted : color.text;

  return (
    <Backdrop>
      <div
        style={{
          position: "absolute",
          left: 220,
          top: headerTop,
          transform: `scale(${headerScale})`,
          transformOrigin: "left top",
        }}
      >
        <FadeUp delay={10} duration={34}>
          <Headline size={type.headline} colour={headerColour}>
            A paramedic has minutes to decide three things.
          </Headline>
        </FadeUp>
      </div>
      <div
        style={{
          position: "absolute",
          left: 220,
          top: 330,
          display: "flex",
          flexDirection: "column",
          gap: 58,
        }}
      >
        {QUESTIONS.map((question, index) => {
          const delay = 112 + index * 40;
          return (
            <FadeUp key={question} delay={delay} duration={34} distance={34}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 44 }}>
                <span style={{ fontFamily: FONT_MONO, fontSize: 36, color: color.dim, width: 60 }}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <Headline size={84} weight={500}>
                  {question}
                </Headline>
              </div>
              <div
                style={{
                  marginTop: 26,
                  marginLeft: 104,
                  height: 1,
                  width: 1000 * progress(frame, delay + 10, 50),
                  backgroundColor: color.hairline,
                }}
              />
            </FadeUp>
          );
        })}
      </div>
    </Backdrop>
  );
};
