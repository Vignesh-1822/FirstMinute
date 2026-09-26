export type DotMatrixPattern = "full" | "diamond" | "cross" | "ring" | "logo";
export type DotMatrixMode = "static" | "loading" | "pulse";

export interface DotMatrixProps {
  /** Rendered size of the whole grid in px. */
  size?: number;
  pattern?: DotMatrixPattern;
  mode?: DotMatrixMode;
  /** Change this value to replay the ripple in "pulse" mode. */
  pulseKey?: string | number | null;
  /** Tailwind text-* class; dots use currentColor. */
  className?: string;
  /** Resting opacity of lit dots. */
  restOpacity?: number;
  label?: string;
}
