import type { ReactNode } from "react";
import type { TranscriptSegment } from "@/types";
import { cn } from "@/lib/utils";

interface TranscriptViewProps {
  segments: TranscriptSegment[];
  live: boolean;
  empty: ReactNode;
  className?: string;
}

/**
 * Live transcript. Phrases that likely triggered an item are underlined
 * (dotted) with the item name on hover; follow-up answers render as their own line.
 */
export function TranscriptView({ segments, live, empty, className }: TranscriptViewProps) {
  if (segments.length === 0) return <div className={className}>{empty}</div>;
  return (
    <p className={cn("text-[13.5px] leading-[1.65] whitespace-pre-line text-foreground/90", className)}>
      {segments.map((segment, index) =>
        segment.highlight ? (
          <mark
            key={`${segment.highlight.start}-${index}`}
            title={segment.highlight.label}
            className="rounded-[3px] bg-foreground/[0.06] px-0.5 text-foreground underline decoration-foreground/35 decoration-dotted underline-offset-[3px]"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={`plain-${index}`}>{segment.text}</span>
        ),
      )}
      {live ? (
        <span aria-hidden className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[3px] animate-blink bg-signal" />
      ) : null}
    </p>
  );
}
