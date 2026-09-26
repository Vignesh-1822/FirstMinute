import React from "react";
import { useCurrentFrame } from "remotion";
import { progress } from "../lib/anim";
import { color, FONT_SANS } from "../theme";
import { DotMatrixPulse } from "./DotMatrix";

type WordmarkProps = {
  start: number;
  size?: number;
};

const WORD = "FirstMinute";

/** Dot-matrix mark + "FirstMinute", letters settling in one after another. */
export const Wordmark: React.FC<WordmarkProps> = ({ start, size = 150 }) => {
  const frame = useCurrentFrame();
  const markIn = progress(frame, start, 30);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.26 }}>
      <div style={{ opacity: markIn, transform: `scale(${0.85 + markIn * 0.15})` }}>
        <DotMatrixPulse trigger={start + 4} size={size * 0.9} grid={9} tint={color.signal} />
      </div>
      <div
        style={{
          display: "flex",
          fontFamily: FONT_SANS,
          fontSize: size,
          fontWeight: 600,
          letterSpacing: "-0.045em",
          color: color.text,
          lineHeight: 1,
        }}
      >
        {WORD.split("").map((letter, index) => {
          const letterIn = progress(frame, start + 6 + index * 2.2, 30);
          return (
            <span
              key={`${letter}-${index}`}
              style={{
                display: "inline-block",
                opacity: letterIn,
                transform: `translateY(${(1 - letterIn) * size * 0.18}px)`,
                filter: `blur(${(1 - letterIn) * 8}px)`,
                color: index >= 5 ? color.text : color.textSoft,
              }}
            >
              {letter}
            </span>
          );
        })}
      </div>
    </div>
  );
};
