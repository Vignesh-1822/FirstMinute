import { useEffect, useMemo, useState } from "react";
import type { Case, JevCallStats, JevMeterTotals } from "@/types";

interface Ledger {
  caseId: string | null;
  entries: Record<string, JevCallStats>;
}

/**
 * Running Jev totals for the current case. Call count and latency come from the
 * server timeline (authoritative); tokens and cost are accumulated from each
 * distinct assessment the console has seen.
 */
export function useJevMeter(caseData: Case | undefined): JevMeterTotals {
  const [ledger, setLedger] = useState<Ledger>({ caseId: null, entries: {} });
  const caseId = caseData?.id ?? null;
  const assessment = caseData?.assessment ?? null;
  const computedAt = assessment?.computed_at ?? null;

  useEffect(() => {
    setLedger((previous) => {
      const base = previous.caseId === caseId ? previous.entries : {};
      if (!assessment || !computedAt || base[computedAt]) {
        return previous.caseId === caseId ? previous : { caseId, entries: base };
      }
      return { caseId, entries: { ...base, [computedAt]: assessment.jev } };
    });
  }, [caseId, computedAt, assessment]);

  return useMemo(() => {
    const entries = ledger.caseId === caseId ? Object.values(ledger.entries) : [];
    const jevEvents = (caseData?.timeline ?? []).filter((event) => event.kind === "jev");
    const calls = Math.max(jevEvents.length, entries.length);
    const timelineLatency = jevEvents.reduce((sum, event) => sum + (event.latency_ms ?? 0), 0);
    const ledgerLatency = entries.reduce((sum, entry) => sum + entry.latency_ms, 0);
    return {
      calls,
      questions: entries.reduce((sum, entry) => sum + entry.questions, 0),
      latencyMs: jevEvents.length >= entries.length ? timelineLatency : ledgerLatency,
      costUsd: entries.reduce((sum, entry) => sum + entry.cost_usd, 0),
      lastLatencyMs: assessment?.jev.latency_ms ?? null,
      lastComputedAt: computedAt,
    };
  }, [ledger, caseId, caseData?.timeline, assessment, computedAt]);
}
