import { CheckCircle2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { DotMatrix, Eyebrow } from "@/components/atoms";
import { FlagChips, FollowUpPrompt, ItemRow, JevPulse, Panel, ScoreSummary } from "@/components/molecules";
import { useProtocols } from "@/hooks";
import type { ConsoleSession, Protocol } from "@/types";
import { cn } from "@/lib/utils";

interface ScoringPanelProps {
  session: ConsoleSession;
  className?: string;
}

export function ScoringPanel({ session, className }: ScoringPanelProps) {
  const protocols = useProtocols();
  const protocol: Protocol | undefined = protocols.data?.find((candidate) => candidate.id === session.protocolId);
  const assessment = session.caseData?.assessment ?? null;
  const followUps = assessment?.follow_ups ?? [];
  const waiting = !assessment && (session.isStreaming || session.caseData !== undefined);
  const scenarioAnswers = session.activeScenario?.follow_up_answers ?? {};
  const isStroke = session.protocolId === "stroke_race";

  if (!protocol) {
    return (
      <div className={cn("surface flex items-center justify-center gap-3 rounded-xl text-[13px] text-muted-foreground", className)}>
        <DotMatrix size={22} mode={protocols.isError ? "static" : "loading"} className="text-foreground" />
        {protocols.isError ? "Protocols unavailable — is the backend running?" : "Loading protocol pack"}
      </div>
    );
  }

  const extracted = assessment?.extracted ?? {};

  return (
    <div className={cn("flex min-h-0 flex-col gap-3", className)}>
      <section className="surface shrink-0 rounded-xl">
        <div className="flex items-start justify-between gap-4 p-4 pb-3">
          {isStroke ? (
            <ScoreSummary assessment={assessment} maxScore={protocol.max_score ?? 9} scaleName="RACE" />
          ) : (
            <div className="flex flex-col gap-2">
              <Eyebrow>9-Line MEDEVAC</Eyebrow>
              <div className="flex gap-6 font-mono text-[13px]">
                <span>
                  <span className="text-faint">L1 </span>
                  {String(extracted.grid ?? "—")}
                </span>
                <span>
                  <span className="text-faint">L2 </span>
                  {String(extracted.frequency ?? "—")} · {String(extracted.callsign ?? "—")}
                </span>
              </div>
              <span className="w-fit rounded-md border px-2 py-1 text-[12.5px] text-foreground">
                {assessment?.interpretation.label ?? "Awaiting request"}
              </span>
            </div>
          )}
          <JevPulse
            pulseKey={assessment?.computed_at ?? null}
            latencyMs={assessment?.jev.latency_ms ?? null}
            thinking={session.isStreaming}
          />
        </div>
        {assessment && assessment.flags.length > 0 ? (
          <div className="border-t px-4 py-2.5">
            <FlagChips flags={assessment.flags} />
          </div>
        ) : null}
      </section>

      <Panel
        title={protocol.name}
        meta={protocol.description}
        className="shrink-0"
        actions={
          assessment ? (
            <span className="font-mono text-[10.5px] text-faint">
              {assessment.jev.questions} questions · {assessment.jev.mode === "live" ? "Jev live" : "simulated"}
            </span>
          ) : null
        }
      >
        <div role="table" aria-label={`${protocol.short} items`} className="divide-y">
          <div role="row" className="grid grid-cols-[minmax(0,1fr)_minmax(96px,140px)_auto_40px_76px] gap-4 px-4 py-1.5">
            {["Item", "Level", "p", "Conf.", "Status"].map((heading, index) => (
              <span
                role="columnheader"
                key={heading}
                className={cn("text-[10.5px] text-faint", index >= 3 && "text-right", index === 2 && "w-[35px]")}
              >
                {heading}
              </span>
            ))}
          </div>
          {protocol.items.map((definition) => (
            <ItemRow
              key={definition.id}
              definition={definition}
              result={assessment?.items.find((item) => item.id === definition.id)}
              pending={waiting}
            />
          ))}
        </div>
      </Panel>

      <Panel
        title={isStroke ? "Follow-ups" : "Readback"}
        meta={followUps.length ? `${followUps.length} open` : undefined}
        className="min-h-[120px] flex-1"
        bodyClassName="overflow-y-auto scrollbar-thin"
      >
        {!assessment ? (
          <p className="p-4 text-[12.5px] leading-relaxed text-muted-foreground">
            Questions appear only for items the medic did not describe or that Jev is unsure about. Confident items are never re-asked.
          </p>
        ) : followUps.length === 0 ? (
          <div className="flex items-center gap-2.5 p-4 text-[13px]">
            <CheckCircle2 className="size-4 text-confident-ink" strokeWidth={1.5} aria-hidden />
            <span className="text-foreground">Every item described with confidence.</span>
            <span className="text-muted-foreground">Nothing to ask.</span>
          </div>
        ) : (
          <ul className="flex flex-col gap-2 p-3">
            <AnimatePresence initial={false}>
              {followUps.map((followUp) => {
                const definition = protocol.items.find((item) => item.id === followUp.item_id);
                return (
                  <motion.div
                    key={followUp.item_id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  >
                    <FollowUpPrompt
                      followUp={followUp}
                      itemLabel={definition?.label ?? followUp.item_id}
                      quickAnswers={isStroke ? (definition?.levels.slice(0, 3) ?? []) : []}
                      scenarioAnswer={scenarioAnswers[followUp.item_id]}
                      pending={session.pendingAnswer === followUp.item_id}
                      provisional={session.isStreaming}
                      onAnswer={(text) => void session.answerFollowUp(followUp.item_id, text)}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </Panel>
    </div>
  );
}
