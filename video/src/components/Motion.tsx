import React from "react";
import { useCurrentFrame } from "remotion";
import { fadeOut, progress } from "../lib/anim";
import { color, FONT_MONO, FONT_SANS, type } from "../theme";

type FadeUpProps = {
  /** Frame (relative to the enclosing sequence) at which the element starts entering. */
  delay?: number;
  duration?: number;
  distance?: number;
  blur?: number;
  /** Optional frame at which the element starts leaving. */
  exitAt?: number;
  exitDuration?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

/** Fade + rise + de-blur. The film's default way for anything to arrive. */
export const FadeUp: React.FC<FadeUpProps> = ({
  delay = 0,
  duration = 30,
  distance = 28,
  blur = 10,
  exitAt,
  exitDuration = 20,
  style,
  children,
}) => {
  const frame = useCurrentFrame();
  const enter = progress(frame, delay, duration);
  const exit = exitAt === undefined ? 1 : fadeOut(frame, exitAt, exitDuration);
  const opacity = enter * exit;
  return (
    <div
      style={{
        opacity,
        transform: `translateY(${(1 - enter) * distance - (1 - exit) * 12}px)`,
        filter: `blur(${(1 - enter) * blur + (1 - exit) * 6}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

type EyebrowProps = {
  children: React.ReactNode;
  accent?: string;
  style?: React.CSSProperties;
};

/** Small mono uppercase label with a dot, used to orient the viewer. */
export const Eyebrow: React.FC<EyebrowProps> = ({ children, accent = color.dim, style }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 14,
      fontFamily: FONT_MONO,
      fontSize: type.label,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: color.muted,
      ...style,
    }}
  >
    <span
      style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: accent, flexShrink: 0 }}
    />
    {children}
  </div>
);

type CitationProps = { children: React.ReactNode; style?: React.CSSProperties };

/** Quiet source note, bottom of frame. */
export const Citation: React.FC<CitationProps> = ({ children, style }) => (
  <div
    style={{
      fontFamily: FONT_MONO,
      fontSize: type.micro,
      letterSpacing: "0.04em",
      color: color.dim,
      ...style,
    }}
  >
    {children}
  </div>
);

type HeadlineProps = {
  children: React.ReactNode;
  size?: number;
  weight?: 400 | 500 | 600;
  colour?: string;
  style?: React.CSSProperties;
};

export const Headline: React.FC<HeadlineProps> = ({
  children,
  size = type.headline,
  weight = 500,
  colour = color.text,
  style,
}) => (
  <div
    style={{
      fontFamily: FONT_SANS,
      fontSize: size,
      fontWeight: weight,
      letterSpacing: "-0.03em",
      lineHeight: 1.08,
      color: colour,
      ...style,
    }}
  >
    {children}
  </div>
);
