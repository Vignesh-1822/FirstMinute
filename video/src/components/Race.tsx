import React from "react";
import { useCurrentFrame } from "remotion";
import { progress } from "../lib/anim";
import { color, FONT_MONO, FONT_SANS } from "../theme";
import { DotMatrixPulse, LatencyReadout } from "./DotMatrix";

export type ItemStatus = "confident" | "uncertain" | "missing";

const statusTone: Record<ItemStatus, { fg: string; bg: string; label: string }> = {
  confident: { fg: color.confident, bg: color.confidentSoft, label: "confident" },
  uncertain: { fg: color.uncertain, bg: color.uncertainSoft, label: "confirm" },
  missing: { fg: color.muted, bg: "transparent", label: "not mentioned" },
};

type StatusChipProps = { status: ItemStatus; scale?: number; labelOverride?: string };

export const StatusChip: React.FC<StatusChipProps> = ({ status, scale = 1, labelOverride }) => {
  const tone = statusTone[status];
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10 * scale,
        padding: `${7 * scale}px ${16 * scale}px`,
        borderRadius: 999,
        border: `1.5px ${status === "missing" ? "dashed" : "solid"} ${
          status === "missing" ? color.faint : tone.fg
        }`,
        backgroundColor: tone.bg,
        fontFamily: FONT_MONO,
        fontSize: 22 * scale,
        color: tone.fg,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 9 * scale,
          height: 9 * scale,
          borderRadius: 999,
          backgroundColor: status === "missing" ? "transparent" : tone.fg,
          border: status === "missing" ? `1.5px dashed ${color.faint}` : "none",
        }}
      />
      {labelOverride ?? tone.label}
    </div>
  );
};

type RaceRowProps = {
  label: string;
  /** Highest level for the item (2 for most, 1 for gaze). */
  max: number;
  value: number;
  /** 0..1 how far the value's segments have filled. */
  fill: number;
  status: ItemStatus;
  /** Probability per level, drawn as a micro-histogram. */
  probabilities: number[];
  /** 0..1 how far the histogram has grown. */
  histogram?: number;
  width?: number;
  scale?: number;
  highlight?: number;
  /** 0..1 opacity of the status chip. */
  chip?: number;
};

/** One RACE item: label, segmented level bar, micro-histogram, score and status chip. */
export const RaceRow: React.FC<RaceRowProps> = ({
  label,
  max,
  value,
  fill,
  status,
  probabilities,
  histogram = 1,
  width = 1040,
  scale = 1,
  highlight = 0,
  chip = 1,
}) => {
  const tone = statusTone[status];
  const segmentGap = 6 * scale;
  const barWidth = 220 * scale;
  const segmentCount = max;
  const segmentWidth = (barWidth - segmentGap * (segmentCount - 1)) / segmentCount;
  const filledSegments = value * fill;
  const barColour = status === "uncertain" ? color.uncertain : status === "missing" ? color.faint : color.text;

  return (
    <div
      style={{
        width,
        display: "flex",
        alignItems: "center",
        gap: 28 * scale,
        padding: `${20 * scale}px ${26 * scale}px`,
        borderRadius: 14 * scale,
        border: `1px ${status === "missing" ? "dashed" : "solid"} ${
          status === "missing" ? color.faint : color.hairline
        }`,
        backgroundColor: status === "missing" ? "transparent" : color.surface,
        boxShadow: highlight > 0 ? `0 0 0 ${2 * highlight}px ${tone.fg}, 0 0 ${40 * highlight}px ${tone.bg}` : "none",
      }}
    >
      <div
        style={{
          flex: 1,
          fontFamily: FONT_SANS,
          fontSize: 34 * scale,
          fontWeight: 500,
          color: status === "missing" ? color.muted : color.text,
          letterSpacing: "-0.01em",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", gap: segmentGap, width: barWidth }}>
        {Array.from({ length: segmentCount }).map((_, index) => {
          const segmentFill = Math.max(0, Math.min(1, filledSegments - index));
          return (
            <div
              key={index}
              style={{
                position: "relative",
                width: segmentWidth,
                height: 16 * scale,
                borderRadius: 4 * scale,
                backgroundColor: color.surfaceHigh,
                border: `1px ${status === "missing" ? "dashed" : "solid"} ${color.hairlineStrong}`,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  transformOrigin: "left center",
                  transform: `scaleX(${segmentFill})`,
                  backgroundColor: barColour,
                }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4 * scale, height: 34 * scale, width: 35 * scale }}>
        {probabilities.map((p, index) => (
          <div
            key={index}
            style={{
              width: 9 * scale,
              height: Math.max(3 * scale, p * 34 * scale * histogram),
              borderRadius: 2 * scale,
              backgroundColor: index === value && status !== "missing" ? tone.fg : color.faint,
            }}
          />
        ))}
      </div>
      <div
        style={{
          width: 86 * scale,
          textAlign: "right",
          fontFamily: FONT_MONO,
          fontSize: 34 * scale,
          fontWeight: 500,
          color: status === "missing" ? color.faint : color.text,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {status === "missing" ? "–" : Math.round(value * Math.min(1, fill * 1.2))}
        <span style={{ color: color.dim, fontSize: 24 * scale }}>/{max}</span>
      </div>
      <div style={{ width: 230 * scale, display: "flex", justifyContent: "flex-end", opacity: chip }}>
        <StatusChip status={status} scale={scale} />
      </div>
    </div>
  );
};

export type RaceItem = {
  id: string;
  label: string;
  max: number;
  value: number;
  probabilities: number[];
};

/** The demo patient (scenario stroke_lvo): RACE 7/9. */
export const RACE_ITEMS: RaceItem[] = [
  { id: "face", label: "Facial palsy", max: 2, value: 2, probabilities: [0.03, 0.09, 0.88] },
  { id: "arm", label: "Arm motor", max: 2, value: 2, probabilities: [0.02, 0.07, 0.91] },
  { id: "leg", label: "Leg motor", max: 2, value: 1, probabilities: [0.1, 0.81, 0.09] },
  { id: "gaze", label: "Gaze deviation", max: 1, value: 1, probabilities: [0.06, 0.94] },
  { id: "cortical", label: "Aphasia / Agnosia", max: 2, value: 1, probabilities: [0.08, 0.84, 0.08] },
];

type RaceCardProps = {
  /** Frame at which rows start filling. */
  start: number;
  /** Frame at which the Jev pulse fires. */
  pulseAt: number;
  width?: number;
  scale?: number;
};

/** Full RACE card: header with Jev pulse, five rows, total with LVO chip. */
export const RaceCard: React.FC<RaceCardProps> = ({ start, pulseAt, width = 960, scale = 0.88 }) => {
  const frame = useCurrentFrame();
  const totalIn = progress(frame, start + 56, 30);
  const total = RACE_ITEMS.reduce((sum, item) => sum + item.value, 0);
  const lvoIn = progress(frame, start + 80, 24);

  return (
    <div
      style={{
        width,
        borderRadius: 24,
        border: `1px solid ${color.hairline}`,
        backgroundColor: color.bg,
        boxShadow: "0 40px 120px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "22px 30px",
          borderBottom: `1px solid ${color.hairline}`,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontFamily: FONT_SANS, fontSize: 32, fontWeight: 600, color: color.text }}>
            RACE stroke scale
          </div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 22, color: color.dim }}>
            scored by Jev · item by item
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <DotMatrixPulse trigger={pulseAt} size={78} grid={9} tint={color.text} />
          <LatencyReadout trigger={pulseAt} ms={142} fontSize={46} />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "22px 30px" }}>
        {RACE_ITEMS.map((item, index) => {
          const rowStart = start + index * 9;
          const appear = progress(frame, rowStart - 6, 24);
          const fill = progress(frame, rowStart + 4, 34);
          return (
            <div
              key={item.id}
              style={{ opacity: appear, transform: `translateY(${(1 - appear) * 14}px)` }}
            >
              <RaceRow
                label={item.label}
                max={item.max}
                value={item.value}
                fill={fill}
                status="confident"
                chip={progress(frame, rowStart + 26, 20)}
                probabilities={item.probabilities}
                histogram={fill}
                width={width - 60}
                scale={scale}
              />
            </div>
          );
        })}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 30px 26px",
          borderTop: `1px solid ${color.hairline}`,
          opacity: totalIn,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
          <span style={{ fontFamily: FONT_MONO, fontSize: 24, color: color.dim }}>TOTAL</span>
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: 76,
              fontWeight: 500,
              color: color.text,
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
            }}
          >
            {Math.round(total * totalIn)}
            <span style={{ color: color.dim, fontSize: 40 }}>/9</span>
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "12px 24px",
            borderRadius: 999,
            border: `1.5px solid ${color.signal}`,
            backgroundColor: color.signalSoft,
            color: color.signal,
            fontFamily: FONT_MONO,
            fontSize: 30,
            fontWeight: 500,
            opacity: lvoIn,
            transform: `scale(${0.94 + lvoIn * 0.06})`,
          }}
        >
          <span style={{ width: 12, height: 12, borderRadius: 999, backgroundColor: color.signal }} />
          LVO suspected
        </div>
      </div>
    </div>
  );
};
