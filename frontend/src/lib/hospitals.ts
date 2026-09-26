import type { HospitalStatus, Routing } from "@/types";

/** Why a hospital would be skipped, from routing (authoritative) or raw status (before routing). */
export function exclusionReason(hospital: HospitalStatus, routing: Routing | null): string | null {
  const option = routing?.options.find((candidate) => candidate.hospital.id === hospital.id);
  if (option) {
    if (!option.eligible) return option.reasons.join("; ") || "Not eligible";
    if (option.reasons.length > 0 && routing?.lvo_suspected) return option.reasons.join("; ");
    return null;
  }
  if (hospital.ed_status === "diversion") return "ED on diversion";
  if (!hospital.ct_available) return "CT unavailable";
  if ((hospital.level === "CSC" || hospital.level === "TSC") && !hospital.neuro_ir_available) {
    return `Neuro IR unavailable${hospital.note ? ` — ${hospital.note}` : ""}`;
  }
  return null;
}
