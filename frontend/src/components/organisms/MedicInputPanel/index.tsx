import { FastForward, Mic, MicOff, Pause, Play, Square } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DotMatrix, Eyebrow, Waveform } from "@/components/atoms";
import { ComposeBox, Panel, ScenarioPicker, TranscriptView } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useScenarios } from "@/hooks";
import type { ConsoleSession, InputSource } from "@/types";
import { highlightTranscript } from "@/lib/transcriptHighlights";
import { cn } from "@/lib/utils";

interface MedicInputPanelProps {
  session: ConsoleSession;
  className?: string;
}

const SOURCE_COPY: Record<InputSource, string> = {
  idle: "",
  scenario: "Scenario playback",
  mic: "Microphone",
  typed: "Typed",
};

const SPEEDS = [1, 2, 4];

export function MedicInputPanel({ session, className }: MedicInputPanelProps) {
  const scenarios = useScenarios();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const { player, speech } = session;

  const effectiveId = selectedId ?? session.activeScenario?.id ?? scenarios.data?.[0]?.id ?? null;
  const selected = scenarios.data?.find((scenario) => scenario.id === effectiveId) ?? null;
  const playing = player.state === "playing";
  const paused = player.state === "paused";

  const segments = useMemo(
    () => highlightTranscript(session.displayTranscript, session.caseData?.assessment ?? null),
    [session.displayTranscript, session.caseData?.assessment],
  );

  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [session.displayTranscript]);

  const wordCount = session.displayTranscript.split(/\s+/).filter(Boolean).length;

  return (
    <Panel
      title="Medic input"
      meta={SOURCE_COPY[session.inputSource]}
      className={className}
      bodyClassName="flex flex-col"
      actions={
        <span className="font-mono text-[10.5px] tabular-nums text-faint" aria-label={`${wordCount} words`}>
          {wordCount} w
        </span>
      }
    >
      <div className="flex flex-col gap-2 border-b p-3">
        <div className="flex items-center gap-2">
          {scenarios.isPending ? (
            <div className="flex h-8 flex-1 items-center gap-2 rounded-lg border px-2.5 text-[12.5px] text-muted-foreground">
              <DotMatrix size={14} mode="loading" className="text-foreground" />
              Loading scenarios
            </div>
          ) : scenarios.isError ? (
            <div className="flex h-8 flex-1 items-center rounded-lg border border-dashed px-2.5 text-[12.5px] text-muted-foreground">
              Scenarios unavailable
            </div>
          ) : (
            <div className="min-w-0 flex-1">
              <ScenarioPicker
                scenarios={scenarios.data}
                selectedId={effectiveId}
                onSelect={setSelectedId}
                disabled={playing}
              />
            </div>
          )}
          {playing || paused ? (
            <Button
              variant="tactile"
              size="sm"
              className="h-8 w-[76px] rounded-lg"
              onClick={session.newCase}
              aria-label="Stop playback and reset"
            >
              <Square className="size-3" strokeWidth={2} />
              Stop
            </Button>
          ) : (
            <Button
              variant="tactile-ink"
              size="sm"
              className="h-8 w-[76px] rounded-lg"
              disabled={!selected}
              onClick={() => selected && session.playScenario(selected)}
            >
              <Play className="size-3 fill-current" strokeWidth={2} />
              Play
            </Button>
          )}
        </div>

        {player.state !== "idle" ? (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={playing ? "Pause playback" : "Resume playback"}
              disabled={player.state === "done"}
              onClick={playing ? player.pause : player.resume}
            >
              {playing ? <Pause strokeWidth={1.75} /> : <Play strokeWidth={1.75} />}
            </Button>
            <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-foreground/[0.08]" aria-hidden>
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-foreground/70"
                animate={{ width: `${Math.round(player.progress * 100)}%` }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            </div>
            <div className="flex items-center rounded-md border p-0.5" role="group" aria-label="Playback speed">
              {SPEEDS.map((speed) => (
                <button
                  key={speed}
                  type="button"
                  aria-pressed={player.speed === speed}
                  onClick={() => player.setSpeed(speed)}
                  className={cn(
                    "h-5 rounded px-1.5 font-mono text-[10px] tabular-nums transition-colors",
                    player.speed === speed ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {speed}×
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Skip to end of report"
              disabled={player.state === "done"}
              onClick={player.skip}
            >
              <FastForward strokeWidth={1.75} />
            </Button>
          </div>
        ) : selected ? (
          <p className="truncate text-[11.5px] text-muted-foreground">
            {selected.subtitle} · streams at 3.2 words/s like live speech
          </p>
        ) : null}
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto scrollbar-thin px-4 py-3">
        <TranscriptView
          segments={segments}
          live={session.isStreaming}
          empty={
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <DotMatrix size={30} pattern="ring" className="text-foreground" restOpacity={0.22} />
              <div className="max-w-[240px]">
                <p className="text-[13px] font-medium text-foreground">Waiting for the report</p>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                  Play a scenario, speak into the mic, or type. Items score while the medic talks.
                </p>
              </div>
            </div>
          }
          className="min-h-full"
        />
      </div>

      <div className="flex flex-col gap-2 border-t p-3">
        <div className="flex items-end gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  variant={speech.listening ? "tactile-signal" : "tactile"}
                  size="icon-lg"
                  className="size-[52px] rounded-xl"
                  aria-label={speech.listening ? "Stop microphone" : "Start microphone"}
                  aria-pressed={speech.listening}
                  disabled={speech.support === "unsupported"}
                  onClick={speech.listening ? session.stopMic : session.startMic}
                >
                  {speech.listening ? (
                    <Waveform active bars={5} className="h-5 text-white" />
                  ) : speech.support === "unsupported" ? (
                    <MicOff strokeWidth={1.5} className="size-5" />
                  ) : (
                    <Mic strokeWidth={1.5} className="size-5" />
                  )}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {speech.support === "unsupported"
                ? "Web Speech API isn't available in this browser. Use Chrome, or type below."
                : speech.listening
                  ? "Stop and finalise the report"
                  : "Speak the report — interim words stream in"}
            </TooltipContent>
          </Tooltip>
          <ComposeBox
            className="min-w-0 flex-1"
            label="Type a report"
            placeholder="Type or paste a report…"
            onSubmit={session.submitTyped}
            disabled={playing}
          />
        </div>
        {speech.error || session.syncError ? (
          <p role="status" className="text-[11.5px] text-signal-ink">
            {speech.error ?? `Not synced: ${session.syncError}`}
          </p>
        ) : (
          <div className="flex items-center justify-between">
            <Eyebrow className="text-[10px]">Enter to send · Shift+Enter new line</Eyebrow>
          </div>
        )}
      </div>
    </Panel>
  );
}
