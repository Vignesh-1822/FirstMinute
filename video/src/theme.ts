import { Easing } from "remotion";
import { loadFont as loadInterTight } from "@remotion/google-fonts/InterTight";
import { loadFont as loadJetBrainsMono } from "@remotion/google-fonts/JetBrainsMono";

const interTight = loadInterTight("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin"],
});
const jetBrainsMono = loadJetBrainsMono("normal", {
  weights: ["400", "500"],
  subsets: ["latin"],
});

export const FONT_SANS = interTight.fontFamily;
export const FONT_MONO = jetBrainsMono.fontFamily;

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/**
 * Colour tokens. Neutrals carry 95% of every frame; one signal colour
 * (Signal Red-Orange, oklch(0.64 0.21 35)) is reserved for stroke / LVO / alert.
 * Hex values are the sRGB conversions of the OKLCH tokens in the app.
 */
export const color = {
  bg: "#0a0a0a",
  bgDeep: "#050505",
  surface: "#111111",
  surfaceRaised: "#161616",
  surfaceHigh: "#1c1c1c",
  hairline: "#262626",
  hairlineStrong: "#333333",
  dot: "#1f1f1f",
  text: "#fafafa",
  textSoft: "#d4d4d4",
  muted: "#a3a3a3",
  dim: "#737373",
  faint: "#525252",
  /** oklch(0.64 0.21 35) */
  signal: "#f0491c",
  signalSoft: "rgba(240, 73, 28, 0.14)",
  signalGlow: "rgba(240, 73, 28, 0.35)",
  /** oklch(0.72 0.15 160) */
  confident: "#2fc183",
  confidentSoft: "rgba(47, 193, 131, 0.14)",
  /** oklch(0.80 0.15 80) */
  uncertain: "#f0b135",
  uncertainSoft: "rgba(240, 177, 53, 0.14)",
} as const;

/** The single easing curve used across the film: a long, confident ease-out. */
export const EASE = Easing.bezier(0.16, 1, 0.3, 1);
/** Symmetric ease for exits and loops. */
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);

export const type = {
  display: 132,
  hero: 96,
  headline: 72,
  title: 60,
  body: 44,
  small: 36,
  label: 28,
  micro: 24,
} as const;

export const radius = {
  card: 20,
  chip: 999,
  inner: 12,
} as const;
