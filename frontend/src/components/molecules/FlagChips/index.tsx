import { AlertTriangle } from "lucide-react";
import type { Flag } from "@/types";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

interface FlagChipsProps {
  flags: Flag[];
}

/** Safety flags. Active ones are loud (hypoglycaemia mimic is the headline case). */
export function FlagChips({ flags }: FlagChipsProps) {
  if (flags.length === 0) return null;
  const sorted = [...flags].sort((a, b) => Number(b.active) - Number(a.active));
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Safety flags">
      {sorted.map((flag) => (
        <li
          key={flag.id}
          title={`${flag.label} · p=${flag.probability.toFixed(2)} · ${flag.source === "code" ? "rule-based" : "Jev"}`}
          className={cn(
            "inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-[11.5px]",
            flag.active
              ? "bg-signal-soft font-medium text-signal-ink ring-1 ring-signal/40 ring-inset"
              : "border border-border text-faint",
          )}
        >
          {flag.active ? <AlertTriangle className="size-3" strokeWidth={2} aria-hidden /> : null}
          {flag.label}
          <span className="font-mono text-[10px] tabular-nums opacity-80">
            {flag.source === "code" ? "rule" : formatPercent(flag.probability)}
          </span>
          <span className="sr-only">{flag.active ? "active" : "not present"}</span>
        </li>
      ))}
    </ul>
  );
}
