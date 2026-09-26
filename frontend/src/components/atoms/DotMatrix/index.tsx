import { motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { DotMatrixPattern, DotMatrixProps } from "./types";

const GRID = 5;
const CENTER = 2;

function isLit(pattern: DotMatrixPattern, row: number, col: number): boolean {
  const dr = Math.abs(row - CENTER);
  const dc = Math.abs(col - CENTER);
  switch (pattern) {
    case "diamond":
      return dr + dc <= 2;
    case "cross":
      return dr === 0 || dc === 0;
    case "ring":
      return Math.round(Math.hypot(dr, dc)) === 2 || (dr + dc === 1);
    case "logo":
      return dr + dc <= 2 && !(dr === 0 && dc === 0);
    default:
      return true;
  }
}

/**
 * 5×5 dot-matrix — the product's signature motif (after Pixel-Perfect's
 * dotmatrix loader). "loading" breathes in rings, "pulse" fires one ripple
 * from the centre each time `pulseKey` changes.
 */
export function DotMatrix({
  size = 20,
  pattern = "diamond",
  mode = "static",
  pulseKey = null,
  className,
  restOpacity = 0.28,
  label,
}: DotMatrixProps) {
  const reducedMotion = useReducedMotion();
  const dots = useMemo(
    () =>
      Array.from({ length: GRID * GRID }, (_, index) => {
        const row = Math.floor(index / GRID);
        const col = index % GRID;
        return { index, lit: isLit(pattern, row, col), distance: Math.hypot(row - CENTER, col - CENTER) };
      }),
    [pattern],
  );
  const dotSize = Math.max(1.5, size / 8);

  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("inline-grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size, gridTemplateColumns: `repeat(${GRID}, 1fr)`, gridTemplateRows: `repeat(${GRID}, 1fr)` }}
    >
      {dots.map((dot) => {
        const base = dot.lit ? restOpacity : 0.07;
        if (reducedMotion || mode === "static" || !dot.lit) {
          return (
            <span
              key={dot.index}
              className="rounded-full bg-current"
              style={{ width: dotSize, height: dotSize, opacity: base }}
            />
          );
        }
        if (mode === "loading") {
          return (
            <motion.span
              key={dot.index}
              className="rounded-full bg-current"
              style={{ width: dotSize, height: dotSize }}
              initial={{ opacity: base }}
              animate={{ opacity: [base, 1, base] }}
              transition={{ duration: 1.3, repeat: Infinity, delay: dot.distance * 0.16, ease: "easeInOut" }}
            />
          );
        }
        return (
          <motion.span
            key={`${dot.index}-${pulseKey ?? "none"}`}
            className="rounded-full bg-current"
            style={{ width: dotSize, height: dotSize }}
            initial={{ opacity: pulseKey === null ? base : 1, scale: pulseKey === null ? 1 : 1.25 }}
            animate={{ opacity: base, scale: 1 }}
            transition={{ duration: 0.7, delay: dot.distance * 0.06, ease: [0.22, 1, 0.36, 1] }}
          />
        );
      })}
    </span>
  );
}

export type { DotMatrixProps } from "./types";
