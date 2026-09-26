import { cn } from "@/lib/utils";

export type StatusTone = "confident" | "uncertain" | "signal" | "neutral" | "off";

interface StatusDotProps {
  tone: StatusTone;
  ping?: boolean;
  className?: string;
  size?: "sm" | "md";
}

const TONE_CLASS: Record<StatusTone, string> = {
  confident: "bg-confident",
  uncertain: "bg-uncertain",
  signal: "bg-signal",
  neutral: "bg-muted-foreground",
  off: "bg-transparent ring-1 ring-inset ring-faint",
};

export function StatusDot({ tone, ping = false, className, size = "sm" }: StatusDotProps) {
  const dimension = size === "sm" ? "size-1.5" : "size-2";
  return (
    <span aria-hidden className={cn("relative inline-flex shrink-0", dimension, className)}>
      {ping ? (
        <span className={cn("absolute inset-0 animate-ping-slow rounded-full", TONE_CLASS[tone])} />
      ) : null}
      <span className={cn("relative inline-flex rounded-full", dimension, TONE_CLASS[tone])} />
    </span>
  );
}
