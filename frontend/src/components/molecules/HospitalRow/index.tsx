import { StatusDot } from "@/components/atoms";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { HospitalStatus } from "@/types";
import { formatAgo, secondsSince } from "@/lib/format";
import { cn } from "@/lib/utils";

interface HospitalRowProps {
  hospital: HospitalStatus;
  now: number;
  etaMinutes: number | null;
  recommended: boolean;
  excludedReason: string | null;
  /** Mock-mode only: flip neuro IR to demo a reroute without the portal. */
  onToggleIr?: () => void;
}

function Capability({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className={cn(
            "inline-flex h-5 items-center rounded px-1.5 font-mono text-[10px] tracking-wide",
            ok ? "bg-foreground/[0.06] text-foreground/80" : "bg-signal-soft text-signal-ink line-through decoration-1",
          )}
        >
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent>{detail}</TooltipContent>
    </Tooltip>
  );
}

const ED_TONE = { open: "confident", advisory: "uncertain", diversion: "signal" } as const;

export function HospitalRow({ hospital, now, etaMinutes, recommended, excludedReason, onToggleIr }: HospitalRowProps) {
  const stale = secondsSince(hospital.last_checked, now) > 60;
  return (
    <li
      className={cn(
        "grid grid-cols-[8px_minmax(0,1fr)_auto_44px] items-center gap-2.5 px-3 py-[7px]",
        recommended && "bg-foreground/[0.035]",
      )}
    >
      <StatusDot tone={ED_TONE[hospital.ed_status]} />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cn("truncate text-[12.5px] font-medium", excludedReason ? "text-muted-foreground" : "text-foreground")}>
            {hospital.short_name}
          </span>
          <span className="font-mono text-[9.5px] text-faint">{hospital.level}</span>
          {hospital.ed_status !== "open" ? (
            <span className="text-[10.5px] text-signal-ink capitalize">{hospital.ed_status}</span>
          ) : null}
        </div>
        <div className={cn("truncate font-mono text-[10px]", stale ? "text-uncertain-ink" : "text-faint")}>
          {formatAgo(hospital.last_checked, now)} · via {hospital.source === "browserbase" ? "Browserbase" : "direct"}
          {hospital.note ? ` · ${hospital.note}` : ""}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Capability label="CT" ok={hospital.ct_available} detail={hospital.ct_available ? "CT available" : "CT unavailable"} />
        {hospital.level === "CSC" || hospital.level === "TSC" ? (
          onToggleIr ? (
            <button
              type="button"
              onClick={onToggleIr}
              aria-label={`Mock: toggle neuro IR at ${hospital.short_name}`}
              className="rounded"
            >
              <Capability
                label="IR"
                ok={hospital.neuro_ir_available}
                detail={`${hospital.neuro_ir_available ? "Neuro IR available" : "Neuro IR unavailable"} · click to flip (mock)`}
              />
            </button>
          ) : (
            <Capability
              label="IR"
              ok={hospital.neuro_ir_available}
              detail={hospital.neuro_ir_available ? "Neuro IR available" : "Neuro IR unavailable"}
            />
          )
        ) : null}
      </div>
      <span className={cn("text-right font-mono text-[12px] tabular-nums", recommended ? "text-foreground" : "text-muted-foreground")}>
        {etaMinutes === null ? "–" : `${etaMinutes}′`}
      </span>
    </li>
  );
}
