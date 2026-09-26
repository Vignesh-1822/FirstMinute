import React from "react";
import { useCurrentFrame } from "remotion";
import { progress } from "../lib/anim";
import { color, FONT_MONO, FONT_SANS } from "../theme";

type PhoneProps = {
  width?: number;
  height?: number;
  title: string;
  subtitle?: string;
  /** Initials shown in the header avatar(s). */
  avatars?: string[];
  accent?: string;
  children: React.ReactNode;
};

/** iPhone-style frame with a messages header. Pure UI, built from divs. */
export const Phone: React.FC<PhoneProps> = ({
  width = 470,
  height = 940,
  title,
  subtitle,
  avatars = ["FM"],
  accent = color.surfaceHigh,
  children,
}) => (
  <div
    style={{
      width,
      height,
      borderRadius: 72,
      padding: 12,
      background: "linear-gradient(160deg, #2a2a2a 0%, #121212 45%, #1d1d1d 100%)",
      boxShadow:
        "0 0 0 1px #3a3a3a, 0 40px 120px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.08)",
    }}
  >
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        borderRadius: 60,
        overflow: "hidden",
        backgroundColor: "#000000",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 14,
          left: "50%",
          transform: "translateX(-50%)",
          width: 126,
          height: 36,
          borderRadius: 999,
          backgroundColor: "#000",
          boxShadow: "0 0 0 1px #111",
          zIndex: 3,
        }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "20px 38px 0",
          fontFamily: FONT_SANS,
          fontWeight: 600,
          fontSize: 20,
          color: color.text,
        }}
      >
        <span>9:41</span>
        <span style={{ fontFamily: FONT_MONO, fontWeight: 400, fontSize: 16, color: color.muted }}>
          5G
        </span>
      </div>
      <div
        style={{
          marginTop: 30,
          paddingBottom: 18,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          borderBottom: `1px solid ${color.hairline}`,
          backgroundColor: "#0b0b0b",
        }}
      >
        <div style={{ display: "flex" }}>
          {avatars.map((initials, index) => (
            <div
              key={initials}
              style={{
                width: 54,
                height: 54,
                borderRadius: 999,
                marginLeft: index === 0 ? 0 : -14,
                backgroundColor: index === 0 ? accent : color.surfaceHigh,
                border: "2px solid #0b0b0b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: FONT_SANS,
                fontWeight: 600,
                fontSize: 18,
                color: color.text,
              }}
            >
              {initials}
            </div>
          ))}
        </div>
        <div
          style={{
            fontFamily: FONT_SANS,
            fontWeight: 600,
            fontSize: 22,
            color: color.text,
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div style={{ fontFamily: FONT_MONO, fontSize: 15, color: color.dim }}>{subtitle}</div>
        ) : null}
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          gap: 12,
          padding: "18px 18px 34px",
        }}
      >
        {children}
      </div>
    </div>
  </div>
);

type BubbleProps = {
  side: "left" | "right";
  appearAt: number;
  author?: string;
  children: React.ReactNode;
  maxWidth?: number;
  fontSize?: number;
};

/** A message bubble that settles in with a small lift. */
export const Bubble: React.FC<BubbleProps> = ({
  side,
  appearAt,
  author,
  children,
  maxWidth = 340,
  fontSize = 21,
}) => {
  const frame = useCurrentFrame();
  const enter = progress(frame, appearAt, 22);
  const outgoing = side === "right";
  return (
    <div
      style={{
        alignSelf: outgoing ? "flex-end" : "flex-start",
        maxWidth,
        opacity: enter,
        transform: `translateY(${(1 - enter) * 18}px) scale(${0.96 + enter * 0.04})`,
        transformOrigin: outgoing ? "bottom right" : "bottom left",
        display: enter === 0 ? "none" : "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      {author ? (
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 14,
            color: color.dim,
            paddingLeft: outgoing ? 0 : 14,
            textAlign: outgoing ? "right" : "left",
          }}
        >
          {author}
        </div>
      ) : null}
      <div
        style={{
          padding: "12px 18px",
          borderRadius: 24,
          borderBottomRightRadius: outgoing ? 8 : 24,
          borderBottomLeftRadius: outgoing ? 24 : 8,
          backgroundColor: outgoing ? "#ededed" : "#1f1f1f",
          color: outgoing ? "#0a0a0a" : color.text,
          fontFamily: FONT_SANS,
          fontSize,
          lineHeight: 1.3,
          letterSpacing: "-0.005em",
        }}
      >
        {children}
      </div>
    </div>
  );
};
