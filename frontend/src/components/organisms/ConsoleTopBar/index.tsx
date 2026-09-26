import { ArrowLeft, Plus } from "lucide-react";
import { Link } from "react-router";
import { Logo, StatusDot, ThemeToggle } from "@/components/atoms";
import type { StatusTone } from "@/components/atoms";
import { JevMeter, ModeBadges, ProtocolSwitch } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useHealth, useJevMeter } from "@/hooks";
import { apiConfig } from "@/services";
import type { CaseStatus, ConsoleSession, StreamStatus, Theme } from "@/types";
import { ROUTES } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";

interface ConsoleTopBarProps {
  session: ConsoleSession;
  theme: Theme;
  onToggleTheme: () => void;
}

const STATUS_META: Record<CaseStatus, { label: string; tone: StatusTone }> = {
  listening: { label: "Listening", tone: "neutral" },
  needs_info: { label: "Needs info", tone: "uncertain" },
  ready: { label: "Ready", tone: "confident" },
  routed: { label: "Routed", tone: "confident" },
  alerted: { label: "Pre-alert sent", tone: "signal" },
};

const STREAM_COPY: Record<StreamStatus, string> = {
  connecting: "Connecting to event stream",
  open: "Event stream connected",
  error: "Event stream offline — polling",
};

export function ConsoleTopBar({ session, theme, onToggleTheme }: ConsoleTopBarProps) {
  const health = useHealth();
  const meter = useJevMeter(session.caseData);
  const caseData = session.caseData;
  const status = caseData ? STATUS_META[caseData.status] : null;

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
      <Tooltip>
        <TooltipTrigger asChild>
          <Link to={ROUTES.home} className="group flex items-center gap-1.5 rounded-md" aria-label="Back to FirstMinute home">
            <ArrowLeft className="size-3.5 text-faint transition-transform group-hover:-translate-x-0.5" strokeWidth={1.5} aria-hidden />
            <Logo />
          </Link>
        </TooltipTrigger>
        <TooltipContent>Back to overview</TooltipContent>
      </Tooltip>

      <span className="h-5 w-px bg-border" aria-hidden />

      <div className="flex min-w-0 items-center gap-2.5 text-[12.5px]">
        <span className="text-muted-foreground">Case</span>
        <span className="font-mono whitespace-nowrap text-foreground tabular-nums" title={caseData?.id}>{caseData ? caseData.id.slice(0, 8) : "—"}</span>
        <span className="text-faint">·</span>
        <span className="font-mono whitespace-nowrap text-muted-foreground">{caseData?.unit_id ?? "M-14"}</span>
        {caseData?.source === "photon" ? (
          <span className="rounded border px-1.5 py-0.5 text-[10.5px] text-muted-foreground">via iMessage</span>
        ) : null}
        {status ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px]" aria-live="polite">
            <StatusDot tone={status.tone} ping={session.isStreaming} />
            <span className={cn(session.isStreaming && caseData?.status === "listening" ? "shimmer-text" : "text-foreground")}>
              {session.isStreaming ? "Listening" : status.label}
            </span>
          </span>
        ) : (
          <span className="text-[11px] text-faint">No active case</span>
        )}
      </div>

      <ProtocolSwitch value={session.protocolId} onChange={session.changeProtocol} disabled={session.isStreaming} />

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden items-center gap-2 lg:flex">
          <ModeBadges health={health.data} mockMode={apiConfig.useMocks} />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="flex size-6 items-center justify-center rounded-md" aria-label={STREAM_COPY[session.streamStatus]}>
              <StatusDot
                tone={session.streamStatus === "open" ? "confident" : session.streamStatus === "connecting" ? "uncertain" : "off"}
                size="md"
              />
            </span>
          </TooltipTrigger>
          <TooltipContent>{STREAM_COPY[session.streamStatus]}</TooltipContent>
        </Tooltip>
        <JevMeter totals={meter} className="hidden xl:flex" />
        <Button variant="tactile" size="sm" onClick={session.newCase} className="h-7 rounded-md px-2.5 text-xs">
          <Plus strokeWidth={1.75} />
          New case
        </Button>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  );
}
