import type { Point } from "@/types";

/** SPEC ETA formula (display only; the backend owns routing): round(km / 0.9 + 2). */
export function etaFrom(from: Point | null, to: Point): number {
  if (!from) return 0;
  return Math.round(Math.hypot(to.x - from.x, to.y - from.y) / 0.9 + 2);
}
