import { interpolate } from "remotion";
import { EASE, EASE_IN_OUT, FPS } from "../theme";

/** Seconds to frames. */
export const sec = (seconds: number): number => Math.round(seconds * FPS);

/** Eased 0 -> 1 progress starting at `start` frames, lasting `duration` frames. */
export const progress = (
  frame: number,
  start: number,
  duration: number,
  easing: (t: number) => number = EASE,
): number =>
  interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

/** Eased 1 -> 0 fade used for in-scene exits. */
export const fadeOut = (frame: number, start: number, duration: number): number =>
  1 - progress(frame, start, duration, EASE_IN_OUT);

/** Linear map with clamping on both ends. */
export const clampMap = (
  value: number,
  input: [number, number],
  output: [number, number],
): number =>
  interpolate(value, input, output, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

/** A calm, slow breathing value between 0 and 1 (never flashes). */
export const breathe = (frame: number, periodSeconds: number, phase = 0): number =>
  0.5 - 0.5 * Math.cos(((frame / FPS) * 2 * Math.PI) / periodSeconds + phase);

/** Characters of `text` visible after typing for `elapsedFrames` at `charsPerSecond`. */
export const typed = (text: string, elapsedFrames: number, charsPerSecond: number): string => {
  const count = Math.max(0, Math.floor((elapsedFrames / FPS) * charsPerSecond));
  return text.slice(0, count);
};

export const formatThousands = (value: number): string =>
  Math.round(value).toLocaleString("en-US");
