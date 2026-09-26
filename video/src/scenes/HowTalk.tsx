import React from "react";
import { useCurrentFrame } from "remotion";
import { FadeUp } from "../components/Motion";
import { StepLayout } from "../components/StepLayout";
import { breathe, clampMap, progress } from "../lib/anim";
import { color, FONT_MONO, FPS } from "../theme";

type Segment = { text: string; key?: boolean };

const TRANSCRIPT: Segment[] = [
  { text: "Sixty-eight-year-old man. " },
  { text: "Can't lift his right arm", key: true },
  { text: ", " },
  { text: "face drooping on the right", key: true },
  { text: ". " },
  { text: "Speech is garbled", key: true },
  { text: ". Last seen normal " },
  { text: "about forty minutes ago", key: true },
  { text: "." },
];

const TYPE_START = 26;
const CHARS_PER_SECOND = 42;
const HIGHLIGHT_AT = 134;

const Waveform: React.FC<{ speaking: number }> = ({ speaking }) => {
  const frame = useCurrentFrame();
  const bars = 56;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, height: 90 }}>
      {Array.from({ length: bars }).map((_, index) => {
        const t = frame / FPS;
        const envelope =
          0.35 +
          0.35 * Math.sin(t * 5.1 + index * 0.45) +
          0.3 * Math.sin(t * 8.3 + index * 1.13);
        const amplitude = 0.12 + Math.abs(envelope) * 0.88 * speaking;
        return (
          <div
            key={index}
            style={{
              width: 7,
              height: Math.max(6, amplitude * 88),
              borderRadius: 4,
              backgroundColor: index / bars < progressShare(frame) ? color.textSoft : color.faint,
            }}
          />
        );
      })}
    </div>
  );
};

const totalChars = TRANSCRIPT.reduce((sum, segment) => sum + segment.text.length, 0);

function progressShare(frame: number): number {
  return clampMap(((frame - TYPE_START) / FPS) * CHARS_PER_SECOND, [0, totalChars], [0, 1]);
}

const Transcript: React.FC = () => {
  const frame = useCurrentFrame();
  const visibleChars = Math.max(0, Math.floor(((frame - TYPE_START) / FPS) * CHARS_PER_SECOND));
  const highlight = progress(frame, HIGHLIGHT_AT, 30);
  const typingDone = visibleChars >= totalChars;
  let used = 0;

  return (
    <div style={{ fontSize: 40, lineHeight: 1.45, color: color.textSoft, letterSpacing: "-0.01em", minHeight: 180 }}>
      {TRANSCRIPT.map((segment, index) => {
        const available = Math.max(0, Math.min(segment.text.length, visibleChars - used));
        used += segment.text.length;
        if (available === 0) {
          return null;
        }
        const shown = segment.text.slice(0, available);
        return (
          <span
            key={index}
            style={{
              color: segment.key ? color.text : color.textSoft,
              backgroundImage: segment.key
                ? `linear-gradient(${color.signalSoft}, ${color.signalSoft})`
                : undefined,
              backgroundSize: `${highlight * 100}% 100%`,
              backgroundRepeat: "no-repeat",
              borderBottom: segment.key
                ? `2px solid rgba(240, 73, 28, ${0.9 * highlight})`
                : undefined,
            }}
          >
            {shown}
          </span>
        );
      })}
      {!typingDone ? (
        <span
          style={{
            display: "inline-block",
            width: 3,
            height: 42,
            marginLeft: 4,
            verticalAlign: "middle",
            backgroundColor: color.text,
            opacity: 0.25 + 0.75 * breathe(frame, 1.1),
          }}
        />
      ) : null}
    </div>
  );
};

/** Step 1: the medic just talks. */
export const HowTalk: React.FC = () => {
  const frame = useCurrentFrame();
  const speaking = clampMap(frame, [TYPE_START - 10, TYPE_START + 10], [0, 1]) *
    clampMap(frame, [HIGHLIGHT_AT - 20, HIGHLIGHT_AT], [1, 0.15]);
  const seconds = Math.max(0, Math.floor((frame - 20) / FPS));

  return (
    <StepLayout
      index={0}
      headline="The medic just talks."
      support="Voice or text. No form, no tapping."
    >
      <FadeUp delay={8} duration={30} distance={40}>
        <div
          style={{
            width: 940,
            borderRadius: 24,
            border: `1px solid ${color.hairline}`,
            backgroundColor: color.surface,
            boxShadow: "0 40px 120px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "24px 34px",
              borderBottom: `1px solid ${color.hairline}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 999,
                  backgroundColor: color.signal,
                  opacity: 0.5 + 0.5 * breathe(frame, 1.8),
                }}
              />
              <span style={{ fontSize: 30, fontWeight: 500, color: color.text }}>Unit M-14</span>
              <span style={{ fontSize: 30, color: color.dim }}>· live transcript</span>
            </div>
            <span style={{ fontFamily: FONT_MONO, fontSize: 28, color: color.muted }}>
              00:{String(Math.min(59, seconds)).padStart(2, "0")}
            </span>
          </div>
          <div style={{ padding: "30px 34px 10px" }}>
            <Waveform speaking={speaking} />
          </div>
          <div style={{ padding: "18px 34px 40px" }}>
            <Transcript />
          </div>
        </div>
      </FadeUp>
    </StepLayout>
  );
};
