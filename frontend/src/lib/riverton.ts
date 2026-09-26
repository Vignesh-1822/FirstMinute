/**
 * Stylised geography of the fictional city of Riverton (20 × 14 km grid,
 * x east, y south). SVG units: 1 km = 10 units.
 */
import type { Point } from "@/types";

export const MAP_SCALE = 10;
export const MAP_WIDTH = 200;
export const MAP_HEIGHT = 140;

export const toMap = (point: Point): Point => ({ x: point.x * MAP_SCALE, y: point.y * MAP_SCALE });

export const RIVER_PATH =
  "M 121 -4 C 111 22, 95 38, 98 60 S 118 90, 106 114 S 86 136, 84 146";

export const BAY_PATH = "M -2 -2 L 34 -2 C 30 8, 18 16, 6 18 C 2 19, -1 21, -2 23 Z";

export const PARK_PATH = "M 142 66 h 30 a 4 4 0 0 1 4 4 v 18 a 4 4 0 0 1 -4 4 h -30 a 4 4 0 0 1 -4 -4 v -18 a 4 4 0 0 1 4 -4 Z";

export interface Street {
  id: string;
  d: string;
  major: boolean;
}

export const STREETS: Street[] = [
  { id: "mercy-ave", d: "M 0 40 H 200", major: true },
  { id: "central", d: "M 0 80 H 200", major: true },
  { id: "south-rd", d: "M 0 110 H 200", major: true },
  { id: "west-blvd", d: "M 50 0 V 140", major: true },
  { id: "east-blvd", d: "M 135 0 V 140", major: true },
  { id: "north-ln", d: "M 165 0 V 140", major: false },
  { id: "harbor-way", d: "M 0 60 C 40 58, 70 50, 98 60", major: false },
  { id: "ring", d: "M 20 140 C 30 110, 60 95, 85 92", major: false },
  { id: "upper", d: "M 60 20 H 200", major: false },
  { id: "lower", d: "M 0 128 H 200", major: false },
  { id: "x25", d: "M 25 30 V 140", major: false },
  { id: "x85", d: "M 85 0 V 140", major: false },
];

/** Where arterials cross the river — drawn as bridge ticks. */
export const BRIDGES: Point[] = [
  { x: 101.5, y: 40 },
  { x: 108, y: 80 },
  { x: 104.5, y: 110 },
];

/** Street-following route: horizontal leg first, then vertical, with a rounded corner. */
export function routePath(from: Point, to: Point): string {
  const a = toMap(from);
  const b = toMap(to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const radius = Math.min(6, Math.abs(dx) / 2, Math.abs(dy) / 2);
  if (radius < 0.5) return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  return [
    `M ${a.x} ${a.y}`,
    `H ${b.x - sx * radius}`,
    `Q ${b.x} ${a.y} ${b.x} ${a.y + sy * radius}`,
    `V ${b.y}`,
  ].join(" ");
}
