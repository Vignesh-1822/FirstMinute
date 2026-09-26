import React from "react";
import { useCurrentFrame } from "remotion";
import { FadeUp } from "../components/Motion";
import { StepLayout } from "../components/StepLayout";
import { breathe, clampMap, progress } from "../lib/anim";
import { color, EASE_IN_OUT, FONT_MONO, FONT_SANS } from "../theme";

const KM = 48;
const MAP_W = 20 * KM;
const MAP_H = 14 * KM;

type Hospital = {
  id: string;
  name: string;
  level: string;
  x: number;
  y: number;
  labelSide: "left" | "right" | "below";
};

/** Fictional city "Riverton" (see SPEC domain data). */
const HOSPITALS: Hospital[] = [
  { id: "harbor", name: "Harbor Valley", level: "ASRH", x: 2.5, y: 3, labelSide: "right" },
  { id: "riverside", name: "Riverside", level: "PSC", x: 8.5, y: 6, labelSide: "left" },
  { id: "stluke", name: "St. Luke's", level: "TSC", x: 5, y: 9.5, labelSide: "below" },
  { id: "mercy", name: "Mercy General", level: "CSC", x: 13.5, y: 4, labelSide: "right" },
  { id: "northgate", name: "Northgate", level: "PSC", x: 16.5, y: 11, labelSide: "left" },
];

const UNIT = { x: 7, y: 8 };
const ROUTE_STLUKE = "M 336 384 L 336 456 L 240 456";
const ROUTE_MERCY = "M 336 384 L 528 384 L 528 192 L 648 192";

const SCAN_START = 22;
const SCAN_STEP = 10;
const ROUTE_A_AT = 70;
const FLIP_AT = 98;
const ROUTE_B_AT = 124;
const CHOSEN_AT = 152;

const TRACE: { at: number; text: string; tone: string }[] = [
  { at: ROUTE_A_AT, text: "RACE 7 ≥ 5 → LVO suspected, needs thrombectomy", tone: color.muted },
  { at: FLIP_AT + 12, text: "St. Luke's excluded: angio suite occupied", tone: color.uncertain },
  { at: CHOSEN_AT, text: "→ Mercy General · CSC · ETA 12 min", tone: color.signal },
];

const Streets: React.FC = () => {
  const lines: React.ReactNode[] = [];
  for (let x = 1; x < 20; x++) {
    const arterial = x % 4 === 0 || x === 7 || x === 11;
    lines.push(
      <line
        key={`v${x}`}
        x1={x * KM}
        y1={0}
        x2={x * KM}
        y2={MAP_H}
        stroke={arterial ? "#232323" : "#161616"}
        strokeWidth={arterial ? 3 : 1.5}
      />,
    );
  }
  for (let y = 1; y < 14; y++) {
    const arterial = y % 4 === 0 || y === 8;
    lines.push(
      <line
        key={`h${y}`}
        x1={0}
        y1={y * KM}
        x2={MAP_W}
        y2={y * KM}
        stroke={arterial ? "#232323" : "#161616"}
        strokeWidth={arterial ? 3 : 1.5}
      />,
    );
  }
  return <g>{lines}</g>;
};

const RivertonMap: React.FC = () => {
  const frame = useCurrentFrame();
  const routeA = progress(frame, ROUTE_A_AT, 24, EASE_IN_OUT) * (1 - progress(frame, FLIP_AT + 8, 20, EASE_IN_OUT));
  const routeB = progress(frame, ROUTE_B_AT, 36, EASE_IN_OUT);
  const flipped = progress(frame, FLIP_AT, 20);
  const chosen = progress(frame, CHOSEN_AT, 30);
  const unitPulse = breathe(frame, 2);

  return (
    <div style={{ position: "relative", width: MAP_W, height: MAP_H }}>
      <svg
        width={MAP_W}
        height={MAP_H}
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        style={{ position: "absolute", inset: 0, borderRadius: 20, overflow: "hidden" }}
      >
        <rect width={MAP_W} height={MAP_H} fill="#0c0c0c" />
        <Streets />
        <path
          d="M -40 300 C 160 250, 300 340, 470 318 S 760 250, 1000 330"
          fill="none"
          stroke="#131a1d"
          strokeWidth={34}
          strokeLinecap="round"
        />
        <path
          d="M -40 300 C 160 250, 300 340, 470 318 S 760 250, 1000 330"
          fill="none"
          stroke="#1b2428"
          strokeWidth={2}
          strokeDasharray="2 10"
        />
        <path
          d={ROUTE_STLUKE}
          fill="none"
          stroke={color.muted}
          strokeWidth={5}
          strokeDasharray="1"
          pathLength={1}
          strokeDashoffset={1 - routeA}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.8}
        />
        <path
          d={ROUTE_MERCY}
          fill="none"
          stroke={color.signal}
          strokeWidth={7}
          strokeDasharray="1"
          pathLength={1}
          strokeDashoffset={1 - routeB}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {HOSPITALS.map((hospital, index) => {
          const cx = hospital.x * KM;
          const cy = hospital.y * KM;
          const scanAt = SCAN_START + index * SCAN_STEP;
          const scan = clampMap(frame, [scanAt, scanAt + 26], [0, 1]);
          const checked = progress(frame, scanAt + 6, 16);
          const isStLuke = hospital.id === "stluke";
          const isMercy = hospital.id === "mercy";
          const nodeColour =
            isStLuke && flipped > 0.5
              ? color.uncertain
              : isMercy && chosen > 0.3
                ? color.signal
                : checked > 0.5
                  ? color.text
                  : color.faint;
          return (
            <g key={hospital.id}>
              {scan > 0 && scan < 1 ? (
                <circle
                  cx={cx}
                  cy={cy}
                  r={16 + scan * 48}
                  fill="none"
                  stroke={color.text}
                  strokeWidth={2}
                  opacity={0.6 * (1 - scan)}
                />
              ) : null}
              {isMercy ? (
                <circle
                  cx={cx}
                  cy={cy}
                  r={30 + 6 * unitPulse}
                  fill="none"
                  stroke={color.signal}
                  strokeWidth={2}
                  opacity={chosen * 0.6}
                />
              ) : null}
              <circle cx={cx} cy={cy} r={17} fill="#0c0c0c" stroke={nodeColour} strokeWidth={3} strokeDasharray={isStLuke && flipped > 0.5 ? "5 5" : undefined} />
              <rect x={cx - 3} y={cy - 9} width={6} height={18} fill={nodeColour} />
              <rect x={cx - 9} y={cy - 3} width={18} height={6} fill={nodeColour} />
            </g>
          );
        })}
        <circle
          cx={UNIT.x * KM}
          cy={UNIT.y * KM}
          r={22 + unitPulse * 10}
          fill={color.signal}
          opacity={0.12 + 0.1 * (1 - unitPulse)}
        />
        <rect
          x={UNIT.x * KM - 13}
          y={UNIT.y * KM - 13}
          width={26}
          height={26}
          rx={7}
          fill={color.signal}
        />
      </svg>

      {HOSPITALS.map((hospital, index) => {
        const scanAt = SCAN_START + index * SCAN_STEP;
        const labelIn = progress(frame, scanAt + 4, 24);
        const isStLuke = hospital.id === "stluke";
        const isMercy = hospital.id === "mercy";
        const left = hospital.x * KM;
        const top = hospital.y * KM;
        const status = isStLuke
          ? flipped > 0.5
            ? "angio suite occupied"
            : "open · angio ready"
          : isMercy && chosen > 0.3
            ? "ETA 12 min"
            : "open";
        const statusColour = isStLuke && flipped > 0.5 ? color.uncertain : isMercy && chosen > 0.3 ? color.signal : color.dim;
        return (
          <div
            key={hospital.id}
            style={{
              position: "absolute",
              top: hospital.labelSide === "below" ? top + 28 : top - 30,
              left:
                hospital.labelSide === "right"
                  ? left + 40
                  : hospital.labelSide === "below"
                    ? left - 150
                    : undefined,
              width: hospital.labelSide === "below" ? 300 : undefined,
              right: hospital.labelSide === "left" ? MAP_W - left + 36 : undefined,
              textAlign:
                hospital.labelSide === "left" ? "right" : hospital.labelSide === "below" ? "center" : "left",
              opacity: labelIn,
              whiteSpace: "nowrap",
            }}
          >
            <div style={{ fontFamily: FONT_SANS, fontSize: 26, fontWeight: 500, color: color.text }}>
              {hospital.name}
              <span style={{ fontFamily: FONT_MONO, fontSize: 18, color: color.dim, marginLeft: 10 }}>
                {hospital.level}
              </span>
            </div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 20, color: statusColour }}>{status}</div>
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: UNIT.x * KM + 24,
          top: UNIT.y * KM + 14,
          fontFamily: FONT_MONO,
          fontSize: 20,
          color: color.signal,
        }}
      >
        M-14
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 20,
          border: `1px solid ${color.hairline}`,
          pointerEvents: "none",
        }}
      />
    </div>
  );
};

/** Step 4: live hospital status decides the destination. */
export const HowRoute: React.FC = () => {
  const frame = useCurrentFrame();
  const scanned = Math.min(5, Math.max(0, Math.floor((frame - SCAN_START - 6) / SCAN_STEP) + 1));
  return (
    <StepLayout
      index={3}
      headline="It checks every hospital — live."
      support="A browser agent reads the regional status board, via Browserbase + Stagehand."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <FadeUp delay={6} duration={26}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: FONT_MONO,
              fontSize: 22,
              color: color.dim,
            }}
          >
            <span>Riverton EMS resource board</span>
            <span style={{ color: scanned >= 5 ? color.confident : color.muted }}>
              {scanned}/5 hospitals checked
            </span>
          </div>
        </FadeUp>
        <FadeUp delay={8} duration={30} distance={30}>
          <RivertonMap />
        </FadeUp>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 120 }}>
          {TRACE.map((line) => {
            const lineIn = progress(frame, line.at, 24);
            return (
              <div
                key={line.text}
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 26,
                  color: line.tone,
                  opacity: lineIn,
                  transform: `translateX(${(1 - lineIn) * 16}px)`,
                }}
              >
                {line.text}
              </div>
            );
          })}
        </div>
      </div>
    </StepLayout>
  );
};
