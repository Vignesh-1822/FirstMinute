"""Deterministic routing. Jev scores; this module decides - every threshold
comes from config.ROUTING_POLICY and every decision is written to rule_trace
as a short, human-readable string.
"""
from __future__ import annotations

import math
import time
from datetime import datetime, timezone

from config import ROUTING_POLICY
from models import Assessment, HospitalOption, HospitalStatus, Point, Routing


def compute_eta_minutes(unit: Point, hospital: HospitalStatus) -> int:
    dist_km = math.hypot(hospital.x - unit.x, hospital.y - unit.y)
    minutes = dist_km / ROUTING_POLICY["eta_speed_km_per_min"] + ROUTING_POLICY["eta_offset_minutes"]
    return round(minutes)


def _thrombectomy_capable(h: HospitalStatus) -> bool:
    return h.level in ("CSC", "TSC") and h.neuro_ir_available


def _ago(iso_ts: str) -> str:
    try:
        ts = datetime.fromisoformat(iso_ts.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        seconds = max(0, int((now - ts).total_seconds()))
        return f"{seconds}s ago" if seconds < 60 else f"{seconds // 60}m ago"
    except (ValueError, TypeError):
        return "recently"


def _hospital_reasons(h: HospitalStatus) -> tuple[bool, list[str]]:
    """Returns (eligible, reasons) - reasons explain exclusions and any
    thrombectomy-capability caveat, each citing the portal + a timestamp."""
    reasons: list[str] = []
    eligible = True
    ago = _ago(h.last_checked)
    if h.ed_status == "diversion":
        eligible = False
        reasons.append(f"{h.short_name} excluded: ED on diversion (portal, {ago})")
    if not h.ct_available:
        eligible = False
        reasons.append(f"{h.short_name} excluded: CT unavailable (portal, {ago})")
    if h.level in ("CSC", "TSC") and not h.neuro_ir_available:
        reasons.append(f"{h.short_name}: not thrombectomy-capable right now - neuro IR unavailable (portal, {ago})")
    return eligible, reasons


def build_options(unit: Point, hospitals: list[HospitalStatus]) -> list[HospitalOption]:
    options: list[HospitalOption] = []
    for h in hospitals:
        eligible, reasons = _hospital_reasons(h)
        options.append(
            HospitalOption(
                hospital=h,
                eta_minutes=compute_eta_minutes(unit, h),
                eligible=eligible,
                thrombectomy_capable=_thrombectomy_capable(h),
                reasons=reasons,
            )
        )
    return options


def _nearest(options: list[HospitalOption], hospital_order: dict[str, int]) -> HospitalOption:
    return sorted(options, key=lambda o: (o.eta_minutes, hospital_order.get(o.hospital.id, 0)))[0]


def route(assessment: Assessment | None, unit_position: Point | None, hospitals: list[HospitalStatus]) -> Routing:
    start = time.perf_counter()
    unit = unit_position or Point(x=10.0, y=7.0)
    hospital_order = {h.id: i for i, h in enumerate(hospitals)}
    options = build_options(unit, hospitals)

    trace: list[str] = []
    for o in options:
        trace.extend(o.reasons)

    total = assessment.total if assessment else None
    lvo_suspected = bool(total is not None and total >= ROUTING_POLICY["lvo_race_threshold"])
    if total is not None:
        trace.append(
            f"RACE {total:g} {'>=' if lvo_suspected else '<'} {ROUTING_POLICY['lvo_race_threshold']} -> "
            f"{'LVO suspected' if lvo_suspected else 'LVO not suspected'}"
        )
    else:
        trace.append("RACE not yet available -> LVO not suspected")

    lkw_minutes = (assessment.extracted or {}).get("lkw_minutes") if assessment else None
    lkw_hours = (lkw_minutes / 60.0) if isinstance(lkw_minutes, (int, float)) else None
    if lkw_minutes is not None:
        trace.append(f"Last known well {lkw_minutes:g} min ago ({lkw_hours:.1f} h)")
    else:
        trace.append("Last known well not established")

    eligible_options = [o for o in options if o.eligible]
    candidates = eligible_options or options
    if not eligible_options:
        trace.append("No hospital currently meets exclusion criteria - falling back to nearest regardless of status")

    nearest_eligible = _nearest(candidates, hospital_order)
    thrombectomy_candidates = [o for o in candidates if o.thrombectomy_capable]
    nearest_thrombectomy = _nearest(thrombectomy_candidates, hospital_order) if thrombectomy_candidates else None

    if lvo_suspected:
        if lkw_hours is not None and lkw_hours <= ROUTING_POLICY["acute_lkw_hours"]:
            trace.append(f"LKW <= {ROUTING_POLICY['acute_lkw_hours']}h (acute window)")
            if nearest_thrombectomy is not None:
                detour = nearest_thrombectomy.eta_minutes - nearest_eligible.eta_minutes
                if detour <= ROUTING_POLICY["acute_max_detour_minutes"]:
                    trace.append(
                        f"Thrombectomy-capable {nearest_thrombectomy.hospital.short_name} adds {detour} min over "
                        f"nearest eligible {nearest_eligible.hospital.short_name} (<= {ROUTING_POLICY['acute_max_detour_minutes']} min) "
                        f"-> route to {nearest_thrombectomy.hospital.short_name}"
                    )
                    recommended = nearest_thrombectomy
                else:
                    trace.append(
                        f"Thrombectomy-capable {nearest_thrombectomy.hospital.short_name} detour {detour} min exceeds "
                        f"{ROUTING_POLICY['acute_max_detour_minutes']} min -> route to nearest eligible {nearest_eligible.hospital.short_name}"
                    )
                    recommended = nearest_eligible
            else:
                trace.append("No thrombectomy-capable hospital eligible -> route to nearest eligible")
                recommended = nearest_eligible
        elif lkw_hours is not None and lkw_hours <= ROUTING_POLICY["extended_lkw_hours"]:
            trace.append(f"LKW <= {ROUTING_POLICY['extended_lkw_hours']}h (extended window)")
            if nearest_thrombectomy is not None and nearest_thrombectomy.eta_minutes <= ROUTING_POLICY["extended_max_thrombectomy_eta_minutes"]:
                trace.append(
                    f"Thrombectomy-capable {nearest_thrombectomy.hospital.short_name} ETA {nearest_thrombectomy.eta_minutes} min "
                    f"<= {ROUTING_POLICY['extended_max_thrombectomy_eta_minutes']} min -> route there"
                )
                recommended = nearest_thrombectomy
            else:
                trace.append("No thrombectomy-capable hospital within extended-window ETA -> route to nearest eligible")
                recommended = nearest_eligible
        else:
            trace.append("LKW unknown or > 24h -> route to nearest eligible stroke-capable hospital")
            recommended = nearest_eligible
    else:
        trace.append("No LVO suspected -> route to nearest eligible stroke-capable hospital")
        recommended = nearest_eligible

    trace.append(f"Recommended: {recommended.hospital.short_name}, ETA {recommended.eta_minutes} min")
    decided_in_ms = max(1, int((time.perf_counter() - start) * 1000))
    return Routing(
        recommended=recommended,
        options=options,
        lvo_suspected=lvo_suspected,
        rule_trace=trace,
        decided_in_ms=decided_in_ms,
    )
