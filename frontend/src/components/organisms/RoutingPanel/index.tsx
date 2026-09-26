import { ArrowUpRight, BellRing, Check, Loader2, Route as RouteIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { DotMatrix, Eyebrow } from "@/components/atoms";
import { HospitalRow, Panel, RecommendationCard } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHospitals, useNow } from "@/hooks";
import { api, apiConfig } from "@/services";
import type { ConsoleSession, RightPanelView } from "@/types";
import { exclusionReason } from "@/lib/hospitals";
import { etaFrom } from "@/lib/eta";
import { cn } from "@/lib/utils";
import { RivertonMap } from "../RivertonMap";
import { TeamThread } from "../TeamThread";

interface RoutingPanelProps {
  session: ConsoleSession;
  className?: string;
}

export function RoutingPanel({ session, className }: RoutingPanelProps) {
  const hospitalsQuery = useHospitals(session.streamStatus);
  const now = useNow(1000);
  const [viewOverride, setViewOverride] = useState<{ caseId: string | null; view: RightPanelView } | null>(null);
  const caseData = session.caseData;
  const routing = caseData?.routing ?? null;
  const alert = caseData?.alert ?? null;
  const hospitals = hospitalsQuery.data ?? routing?.options.map((option) => option.hospital) ?? [];
  const unitPosition = caseData?.unit_position ?? (session.protocolId === "stroke_race" ? { x: 7, y: 8 } : null);
  const view: RightPanelView =
    viewOverride && viewOverride.caseId === (caseData?.id ?? null) ? viewOverride.view : alert ? "team" : "routing";
  const isStroke = session.protocolId === "stroke_race";
  const canRoute = Boolean(caseData?.assessment) && isStroke && !alert;

  return (
    <div className={cn("flex min-h-0 flex-col gap-3", className)}>
      <Panel
        title="Riverton · live status"
        className="shrink-0"
        actions={
          <a
            href={apiConfig.portalUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded text-[11px] text-muted-foreground hover:text-foreground"
          >
            Regional status board
            <ArrowUpRight className="size-3" strokeWidth={1.75} aria-hidden />
          </a>
        }
      >
        <RivertonMap
          hospitals={hospitals}
          routing={routing}
          unitPosition={unitPosition}
          unitId={caseData?.unit_id ?? "M-14"}
          className="h-[212px]"
        />
      </Panel>

      {alert ? (
        <Tabs value={view} onValueChange={(next) => setViewOverride({ caseId: caseData?.id ?? null, view: next === "team" ? "team" : "routing" })}>
          <TabsList className="h-7 w-full">
            <TabsTrigger value="team" className="text-xs">CODE STROKE thread</TabsTrigger>
            <TabsTrigger value="routing" className="text-xs">Routing</TabsTrigger>
          </TabsList>
        </Tabs>
      ) : null}

      <AnimatePresence mode="wait" initial={false}>
        {view === "team" && caseData && alert ? (
          <motion.div
            key="team"
            className="flex min-h-0 flex-1 flex-col gap-2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="flex items-center gap-2 rounded-lg border border-signal/40 bg-signal-soft px-3 py-2 text-[12.5px]">
              <Check className="size-4 text-signal-ink" strokeWidth={2} aria-hidden />
              <span className="font-medium text-foreground">Pre-alert sent</span>
              <span className="truncate text-muted-foreground">
                {routing?.options.find((option) => option.hospital.id === alert.hospital_id)?.hospital.short_name ?? alert.hospital_id} · ETA{" "}
                <span className="font-mono">{alert.eta_minutes}′</span>
              </span>
            </div>
            <TeamThread caseData={caseData} className="flex-1" />
          </motion.div>
        ) : (
          <motion.div
            key="routing"
            className="flex min-h-0 flex-1 flex-col gap-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <Panel title="Destination" className="shrink-0">
              {!isStroke ? (
                <p className="p-3 text-[12.5px] leading-relaxed text-muted-foreground">
                  The 9-Line pack has no hospital routing. Its outcome is the MEDEVAC request and readback list.
                </p>
              ) : routing ? (
                <RecommendationCard routing={routing} />
              ) : (
                <div className="flex items-center gap-3 p-3">
                  <DotMatrix size={22} mode={session.isRouting ? "loading" : "static"} pattern="cross" className="text-foreground" />
                  <p className="flex-1 text-[12px] leading-relaxed text-muted-foreground">
                    {session.isRouting
                      ? "Applying routing policy…"
                      : "Routes automatically once the report is final and nothing is left to ask. Deterministic rules — no model."}
                  </p>
                  <Button variant="tactile" size="xs" disabled={!canRoute || session.isRouting} onClick={() => void session.requestRoute()}>
                    <RouteIcon strokeWidth={1.5} />
                    Route now
                  </Button>
                </div>
              )}
            </Panel>

            <Panel
              title="Hospitals"
              meta={hospitalsQuery.isError ? "status unavailable" : undefined}
              className="min-h-0 flex-1"
              bodyClassName="overflow-y-auto scrollbar-thin"
              actions={
                <Button
                  variant="ghost"
                  size="xs"
                  className="h-6 text-[11px] text-muted-foreground"
                  onClick={() => void api.refreshHospitals()}
                >
                  Refresh
                </Button>
              }
            >
              {hospitals.length === 0 ? (
                <div className="flex items-center gap-2 p-3 text-[12px] text-muted-foreground">
                  <DotMatrix size={14} mode="loading" className="text-foreground" /> Reading status board
                </div>
              ) : (
                <ul className="divide-y">
                  {[...hospitals]
                    .sort((a, b) => etaFrom(unitPosition, a) - etaFrom(unitPosition, b))
                    .map((hospital) => {
                      const option = routing?.options.find((candidate) => candidate.hospital.id === hospital.id);
                      return (
                        <HospitalRow
                          key={hospital.id}
                          hospital={hospital}
                          now={now}
                          etaMinutes={option?.eta_minutes ?? (unitPosition ? etaFrom(unitPosition, hospital) : null)}
                          recommended={routing?.recommended.hospital.id === hospital.id}
                          excludedReason={exclusionReason(hospital, routing)}
                          onToggleIr={
                            api.setHospitalFlag
                              ? () => void api.setHospitalFlag?.(hospital.id, { neuro_ir_available: !hospital.neuro_ir_available })
                              : undefined
                          }
                        />
                      );
                    })}
                </ul>
              )}
            </Panel>

            {isStroke ? (
              <div className="shrink-0">
                <Button
                  variant="tactile-signal"
                  size="xl"
                  className="w-full"
                  disabled={!routing || session.isConfirming || Boolean(alert)}
                  onClick={() => void session.confirm(routing?.recommended.hospital.id)}
                >
                  {session.isConfirming ? <Loader2 className="animate-spin" /> : <BellRing strokeWidth={1.75} />}
                  {routing ? `Confirm & pre-alert ${routing.recommended.hospital.short_name}` : "Confirm & pre-alert"}
                </Button>
                <Eyebrow className="mt-1.5 block text-center text-[9.5px]">The medic confirms · decision support, not autonomy</Eyebrow>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
