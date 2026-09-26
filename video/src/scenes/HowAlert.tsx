import React from "react";
import { useCurrentFrame } from "remotion";
import { FadeUp } from "../components/Motion";
import { Bubble, Phone } from "../components/Phone";
import { StepLayout } from "../components/StepLayout";
import { progress } from "../lib/anim";
import { color, FONT_MONO, FONT_SANS } from "../theme";

const CARD_AT = 70;
const LOCATION_AT = 118;
const REPLY_AT = 170;

const SBAR: { key: string; text: string }[] = [
  { key: "S", text: "68 M · sudden right-sided weakness, aphasia" },
  { key: "B", text: "Last known well 40 min · no anticoagulants" },
  { key: "A", text: "RACE 7/9 · LVO suspected" },
  { key: "R", text: "Stroke team and angio at the door" },
];

const AlertCard: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = progress(frame, CARD_AT, 26);
  return (
    <div
      style={{
        alignSelf: "flex-start",
        width: 400,
        borderRadius: 22,
        overflow: "hidden",
        border: `1px solid ${color.hairlineStrong}`,
        backgroundColor: "#151515",
        opacity: enter,
        transform: `translateY(${(1 - enter) * 18}px)`,
        display: enter === 0 ? "none" : "block",
      }}
    >
      <div
        style={{
          padding: "12px 18px",
          backgroundColor: color.signal,
          color: "#fff",
          fontFamily: FONT_MONO,
          fontWeight: 500,
          fontSize: 20,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>CODE STROKE</span>
        <span>ETA 12 min</span>
      </div>
      <div style={{ padding: "14px 18px 16px", display: "flex", flexDirection: "column", gap: 9 }}>
        {SBAR.map((row, index) => {
          const rowIn = progress(frame, CARD_AT + 8 + index * 6, 20);
          return (
            <div key={row.key} style={{ display: "flex", gap: 12, opacity: rowIn }}>
              <span style={{ fontFamily: FONT_MONO, fontSize: 18, color: color.signal, width: 16 }}>
                {row.key}
              </span>
              <span style={{ fontFamily: FONT_SANS, fontSize: 19, color: color.textSoft, lineHeight: 1.3 }}>
                {row.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const LocationBubble: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = progress(frame, LOCATION_AT, 26);
  const route = progress(frame, LOCATION_AT + 10, 40);
  return (
    <div
      style={{
        alignSelf: "flex-start",
        width: 300,
        borderRadius: 22,
        overflow: "hidden",
        border: `1px solid ${color.hairline}`,
        backgroundColor: "#151515",
        opacity: enter,
        transform: `translateY(${(1 - enter) * 18}px)`,
        display: enter === 0 ? "none" : "block",
      }}
    >
      <svg width={300} height={130} viewBox="0 0 300 130">
        <rect width={300} height={130} fill="#0e0e0e" />
        {[40, 80, 120, 160, 200, 240, 280].map((x) => (
          <line key={`x${x}`} x1={x} y1={0} x2={x} y2={130} stroke="#1c1c1c" strokeWidth={1.5} />
        ))}
        {[30, 65, 100].map((y) => (
          <line key={`y${y}`} x1={0} y1={y} x2={300} y2={y} stroke="#1c1c1c" strokeWidth={1.5} />
        ))}
        <path
          d="M 60 100 L 160 100 L 160 30 L 240 30"
          fill="none"
          stroke={color.signal}
          strokeWidth={4}
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset={1 - route}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x={50} y={90} width={20} height={20} rx={5} fill={color.signal} />
        <circle cx={240} cy={30} r={10} fill="#0e0e0e" stroke={color.text} strokeWidth={3} />
      </svg>
      <div style={{ padding: "10px 16px 12px", fontFamily: FONT_SANS, fontSize: 18, color: color.textSoft }}>
        Unit M-14 · live location
      </div>
    </div>
  );
};

const EVENTS: { at: number; stamp: string; label: string; via: string }[] = [
  { at: 30, stamp: "t+0.0s", label: "Medic confirms", via: "one reply: CONFIRM" },
  { at: 58, stamp: "t+0.6s", label: "SBAR handoff written", via: "LLM on GMI Cloud" },
  { at: 86, stamp: "t+1.2s", label: "Group chat opened", via: "iMessage via Photon" },
];

const EventRail: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 40, width: 380 }}>
      {EVENTS.map((event, index) => {
        const eventIn = progress(frame, event.at, 26);
        return (
          <div
            key={event.label}
            style={{
              display: "flex",
              gap: 22,
              opacity: eventIn,
              transform: `translateY(${(1 - eventIn) * 16}px)`,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 14,
                  height: 14,
                  marginTop: 10,
                  borderRadius: 999,
                  backgroundColor: index === EVENTS.length - 1 ? color.signal : color.text,
                }}
              />
              {index < EVENTS.length - 1 ? (
                <span style={{ width: 1.5, height: 122, backgroundColor: color.hairlineStrong }} />
              ) : null}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontFamily: FONT_MONO, fontSize: 22, color: color.dim }}>{event.stamp}</span>
              <span style={{ fontSize: 32, fontWeight: 500, color: color.text }}>{event.label}</span>
              <span style={{ fontFamily: FONT_MONO, fontSize: 22, color: color.muted }}>{event.via}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** Step 5: the stroke team is waiting at the door. */
export const HowAlert: React.FC = () => (
  <StepLayout
    index={4}
    headline="The stroke team is waiting at the door."
    support="The medic confirms. The team gets a CODE STROKE group chat."
  >
    <div style={{ display: "flex", alignItems: "center", gap: 70 }}>
      <EventRail />
      <FadeUp delay={10} duration={40} distance={50}>
        <Phone
          width={480}
          height={900}
          title="CODE STROKE · M-14"
          subtitle="Mercy stroke team · 4 people"
          avatars={["FM", "NR", "IR"]}
          accent={color.signal}
        >
          <div
            style={{
              alignSelf: "center",
              fontFamily: FONT_MONO,
              fontSize: 14,
              color: color.dim,
              marginBottom: 6,
            }}
          >
            FirstMinute opened this group
          </div>
          <AlertCard />
          <LocationBubble />
          <Bubble side="right" appearAt={REPLY_AT} author="Stroke team · Mercy" fontSize={20}>
            On our way down. Angio suite ready.
          </Bubble>
        </Phone>
      </FadeUp>
    </div>
  </StepLayout>
);
