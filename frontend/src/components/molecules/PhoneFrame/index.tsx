import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PhoneFrameProps {
  title: string;
  subtitle?: ReactNode;
  initials: string;
  accent?: "neutral" | "signal";
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/** iPhone-style thread mockup: bezel, dynamic island, compact header, scroll body. */
export function PhoneFrame({ title, subtitle, initials, accent = "neutral", children, footer, className }: PhoneFrameProps) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-col rounded-[30px] border border-border-strong bg-[oklch(0.12_0_0)] p-[5px] shadow-[0_1px_0_var(--highlight)_inset,0_12px_32px_-12px_oklch(0_0_0/0.45)]",
        className,
      )}
    >
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[25px] bg-background">
        <div className="relative flex h-7 shrink-0 items-center justify-between px-6 pt-1 font-mono text-[10px] font-medium text-foreground/80">
          <span>9:41</span>
          <span aria-hidden className="absolute top-1.5 left-1/2 h-[18px] w-[68px] -translate-x-1/2 rounded-full bg-[oklch(0.1_0_0)]" />
          <span aria-hidden className="flex items-center gap-1">
            <span className="flex items-end gap-[1.5px]">
              {[3, 5, 7, 9].map((height) => (
                <span key={height} className="w-[2.5px] rounded-[1px] bg-foreground/80" style={{ height }} />
              ))}
            </span>
            <span className="ml-1 h-[9px] w-[18px] rounded-[3px] border border-foreground/60 p-[1px]">
              <span className="block h-full w-3/4 rounded-[1px] bg-foreground/80" />
            </span>
          </span>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1 border-b px-4 pt-1 pb-2">
          <span
            aria-hidden
            className={cn(
              "flex size-7 items-center justify-center rounded-full text-[10px] font-semibold",
              accent === "signal" ? "bg-signal text-white" : "bg-muted text-foreground",
            )}
          >
            {initials}
          </span>
          <span className="max-w-full truncate text-[11.5px] font-semibold text-foreground">{title}</span>
          {subtitle ? <span className="-mt-0.5 max-w-full truncate text-[10px] text-muted-foreground">{subtitle}</span> : null}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none px-3 py-3">{children}</div>
        {footer ? <div className="shrink-0 border-t px-2 py-2">{footer}</div> : null}
      </div>
    </div>
  );
}
