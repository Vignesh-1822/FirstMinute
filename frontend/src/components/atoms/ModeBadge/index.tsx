import { cn } from "@/lib/utils";

interface ModeBadgeProps {
  name: string;
  /** Short state label, e.g. LIVE / SIM / DIRECT. */
  state: string;
  live: boolean;
  className?: string;
  title?: string;
}

/** Integration mode. Live = solid teal dot; simulated = hollow dot on a dashed border. */
export function ModeBadge({ name, state, live, className, title }: ModeBadgeProps) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-[11px] leading-none",
        live ? "border border-border bg-card" : "border border-dashed border-border-strong",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full", live ? "bg-confident" : "ring-1 ring-inset ring-muted-foreground")}
      />
      <span className="text-muted-foreground">{name}</span>
      <span className={cn("font-mono text-[10px] tracking-wide", live ? "text-confident-ink" : "text-foreground/80")}>
        {state}
      </span>
    </span>
  );
}
