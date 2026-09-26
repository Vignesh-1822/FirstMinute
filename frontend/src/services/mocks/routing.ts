/** Deterministic routing — mirrors SPEC "Routing rules". Numbers live in ROUTING_POLICY. */
import type { HospitalOption, HospitalStatus, Point, Routing } from "@/types";
import { ROUTING_POLICY } from "./data";

export function etaMinutes(from: Point, hospital: Pick<HospitalStatus, "x" | "y">): number {
  const km = Math.hypot(hospital.x - from.x, hospital.y - from.y);
  return Math.round(km / ROUTING_POLICY.speedKmPerMin + ROUTING_POLICY.offloadMin);
}

function secondsAgo(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
}

export function routeCase(
  hospitals: HospitalStatus[],
  unitPosition: Point,
  raceTotal: number,
  lkwMinutes: number | null,
): Routing {
  const started = performance.now();
  const trace: string[] = [];

  const options: HospitalOption[] = hospitals
    .map((hospital) => {
      const reasons: string[] = [];
      const age = `${hospital.source === "browserbase" ? "Browserbase" : "portal"}, ${secondsAgo(hospital.last_checked)}s ago`;
      if (hospital.ed_status === "diversion") reasons.push(`ED on diversion (${age})`);
      if (!hospital.ct_available) reasons.push(`CT unavailable (${age})`);
      const thrombectomyCapable =
        (hospital.level === "CSC" || hospital.level === "TSC") && hospital.neuro_ir_available;
      if ((hospital.level === "CSC" || hospital.level === "TSC") && !hospital.neuro_ir_available) {
        reasons.push(`neuro IR unavailable${hospital.note ? ` — ${hospital.note.toLowerCase()}` : ""} (${age})`);
      }
      return {
        hospital,
        eta_minutes: etaMinutes(unitPosition, hospital),
        eligible: hospital.ed_status !== "diversion" && hospital.ct_available,
        thrombectomy_capable: thrombectomyCapable,
        reasons,
      };
    })
    .sort((a, b) => a.eta_minutes - b.eta_minutes);

  options
    .filter((option) => !option.eligible)
    .forEach((option) => trace.push(`${option.hospital.short_name} excluded: ${option.reasons.join("; ")}`));

  const eligible = options.filter((option) => option.eligible);
  const nearest = eligible[0] ?? options[0];
  const nearestThrombectomy = eligible.find((option) => option.thrombectomy_capable);
  const lvo = raceTotal >= ROUTING_POLICY.lvoThreshold;

  trace.push(
    lvo
      ? `RACE ${raceTotal} ≥ ${ROUTING_POLICY.lvoThreshold} → LVO suspected`
      : `RACE ${raceTotal} < ${ROUTING_POLICY.lvoThreshold} → LVO not suspected`,
  );

  eligible
    .filter((option) => !option.thrombectomy_capable && (option.hospital.level === "CSC" || option.hospital.level === "TSC"))
    .forEach((option) => trace.push(`${option.hospital.short_name} not thrombectomy-capable now: ${option.reasons.join("; ")}`));

  let recommended = nearest;
  if (lvo && lkwMinutes !== null && lkwMinutes <= ROUTING_POLICY.lkwEarlyWindowMin && nearestThrombectomy) {
    const extra = nearestThrombectomy.eta_minutes - nearest.eta_minutes;
    trace.push(`LKW ${lkwMinutes} min ≤ 4.5 h → thrombectomy window`);
    if (extra <= ROUTING_POLICY.maxExtraMinutesForThrombectomy) {
      recommended = nearestThrombectomy;
      trace.push(
        `${nearestThrombectomy.hospital.short_name} +${extra} min vs nearest (${nearest.hospital.short_name}) ≤ ${ROUTING_POLICY.maxExtraMinutesForThrombectomy} → bypass`,
      );
    } else {
      trace.push(`Thrombectomy centre +${extra} min > ${ROUTING_POLICY.maxExtraMinutesForThrombectomy} → nearest eligible`);
    }
  } else if (
    lvo &&
    lkwMinutes !== null &&
    lkwMinutes <= ROUTING_POLICY.lkwLateWindowMin &&
    nearestThrombectomy &&
    nearestThrombectomy.eta_minutes <= ROUTING_POLICY.maxEtaLateWindowMin
  ) {
    recommended = nearestThrombectomy;
    trace.push(`LKW ${lkwMinutes} min, late window → nearest thrombectomy-capable ≤ 60 min`);
  } else {
    if (lvo && lkwMinutes === null) trace.push("LKW unknown → nearest eligible stroke-capable");
    else trace.push("Nearest eligible stroke-capable hospital");
  }

  trace.push(`→ ${recommended.hospital.name}, ETA ${recommended.eta_minutes} min`);

  return {
    recommended,
    options,
    lvo_suspected: lvo,
    rule_trace: trace,
    decided_in_ms: Number((performance.now() - started + 0.4).toFixed(2)),
  };
}
