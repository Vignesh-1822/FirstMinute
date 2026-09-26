import { MapPin } from "lucide-react";
import { motion } from "motion/react";
import type { Message } from "@/types";
import { formatClock } from "@/lib/format";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: Message;
  outgoing: boolean;
  showAuthor?: boolean;
}

function LocationTile({ text }: { text: string }) {
  return (
    <div className="w-[190px] overflow-hidden rounded-2xl border bg-card">
      <div className="relative h-[84px] bg-map-land bg-dot-grid">
        <svg aria-hidden viewBox="0 0 190 84" className="absolute inset-0 size-full">
          <path d="M120 -4 C 108 30, 96 40, 104 90" fill="none" stroke="var(--map-water)" strokeWidth="10" />
          <path d="M0 52 H190 M60 0 V84" stroke="var(--map-street)" strokeWidth="2" />
        </svg>
        <span className="absolute top-1/2 left-[60px] flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-signal text-white shadow">
          <MapPin className="size-3.5" strokeWidth={2} aria-hidden />
        </span>
      </div>
      <div className="px-2.5 py-1.5 text-[11px] text-muted-foreground">{text}</div>
    </div>
  );
}

export function MessageBubble({ message, outgoing, showAuthor = false }: MessageBubbleProps) {
  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn("flex flex-col gap-0.5", outgoing ? "items-end" : "items-start")}
    >
      {showAuthor && !outgoing ? <span className="px-3 text-[10px] text-muted-foreground">{message.author}</span> : null}
      {message.kind === "location" ? (
        <LocationTile text={message.text} />
      ) : (
        <div
          className={cn(
            "max-w-[86%] rounded-[18px] px-3 py-1.5 text-[12.5px] leading-snug whitespace-pre-line",
            outgoing ? "rounded-br-md bg-foreground text-background" : "rounded-bl-md bg-muted text-foreground",
            message.kind === "alert" && "border border-signal/50 bg-signal-soft",
          )}
        >
          {message.kind === "alert" ? (
            <span className="mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.08em] text-signal-ink uppercase">
              <span className="size-1.5 rounded-full bg-signal" aria-hidden />
              Code stroke
            </span>
          ) : null}
          {message.text}
        </div>
      )}
      <time dateTime={message.at} className="px-2 font-mono text-[9.5px] text-faint">
        {formatClock(message.at)}
      </time>
    </motion.div>
  );
}
