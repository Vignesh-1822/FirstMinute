"""Case orchestration: creates cases, runs (and coalesces) assessments,
routes, and confirms/alerts. This is the one place that ties together
assessment_service, routing_service, hospital_service and llm_service.

Per-case coalescing: only one Jev assessment ever runs at a time for a given
case. If new transcript text arrives while a run is in flight, it's queued
and the case is reassessed once more with the latest text as soon as the
current run finishes - it never runs two assessments concurrently for the
same case.
"""
from __future__ import annotations

import asyncio
import logging
import random
from uuid import uuid4

from config import HOSPITAL_ADDRESSES, settings
from models import (
    Alert,
    Case,
    CreateCase,
    HospitalStatus,
    Message,
)
from services import assessment_service, case_store, hospital_service, llm_service, protocol_service, routing_service
from services.event_bus import bus

logger = logging.getLogger(__name__)


class CaseNotFoundError(Exception):
    pass


class RoutingNotSupportedError(Exception):
    pass


# Per-case coalescing state.
_inflight: dict[str, bool] = {}
_pending_transcript: dict[str, str] = {}


def _require_case(case_id: str) -> Case:
    case = case_store.get_case(case_id)
    if case is None:
        raise CaseNotFoundError(case_id)
    return case


def _default_unit_id(source: str) -> str:
    if source == "photon":
        return f"Unit-{random.randint(10, 29)}"
    return f"M-{random.randint(10, 29)}"


def _append_message(case: Case, thread: str, author: str, role: str, text: str, kind: str = "text") -> Message:
    msg = Message(id=str(uuid4()), thread=thread, author=author, role=role, text=text, kind=kind, at=case_store.now_iso())
    case.messages.append(msg)
    return msg


# ---------------------------------------------------------------------------
# Create / read
# ---------------------------------------------------------------------------
async def create_case(payload: CreateCase) -> Case:
    if payload.protocol_id not in protocol_service.PACK_IDS:
        raise KeyError(payload.protocol_id)
    case = Case(
        id=str(uuid4()),
        protocol_id=payload.protocol_id,
        source=payload.source,
        created_at=case_store.now_iso(),
        unit_id=payload.unit_id or _default_unit_id(payload.source),
        unit_position=payload.unit_position,
        transcript="",
        status="listening",
    )
    case_store.add_case(case)
    case_store.append_timeline(case, kind="medic", label="Case opened", detail=f"protocol={payload.protocol_id}")
    case_store.save_case(case)
    await case_store.publish_case_updated(case)
    return case


def get_case(case_id: str) -> Case:
    return _require_case(case_id)


def list_cases() -> list[Case]:
    return case_store.list_cases()


# ---------------------------------------------------------------------------
# Transcript / assessment (coalesced)
# ---------------------------------------------------------------------------
def _status_from_assessment(assessment) -> str:
    if assessment is None:
        return "listening"
    if assessment.follow_ups:
        return "needs_info"
    return "ready"


async def _run_assessment_cycle(case_id: str, transcript_snapshot: str) -> Case:
    assessment = await assessment_service.run_assessment(_require_case(case_id).protocol_id, transcript_snapshot)
    case = _require_case(case_id)
    case.assessment = assessment
    if case.status != "alerted":
        case.status = _status_from_assessment(assessment)

    case_store.append_timeline(
        case,
        kind="jev",
        label=f"Jev scored {assessment.jev.questions} questions",
        detail=f"mode={assessment.jev.mode}",
        latency_ms=assessment.jev.latency_ms,
    )
    if assessment.follow_ups:
        detail = "; ".join(f"{fu.item_id} ({fu.reason})" for fu in assessment.follow_ups)
        case_store.append_timeline(case, kind="followup", label=f"{len(assessment.follow_ups)} follow-up(s) needed", detail=detail)

    case_store.save_case(case)
    await case_store.publish_case_updated(case)
    return case


async def _coalesced_assess(case_id: str, transcript: str) -> Case:
    case = _require_case(case_id)
    case.transcript = transcript
    case_store.save_case(case)

    if transcript.strip() == "":
        case.assessment = None
        if case.status != "alerted":
            case.status = "listening"
        case_store.save_case(case)
        await case_store.publish_case_updated(case)
        return case

    _pending_transcript[case_id] = transcript
    if _inflight.get(case_id):
        return case

    _inflight[case_id] = True
    try:
        while True:
            text_to_run = _pending_transcript.pop(case_id, None)
            if text_to_run is None:
                break
            case = await _run_assessment_cycle(case_id, text_to_run)
    finally:
        _inflight[case_id] = False
    return case


async def set_transcript(case_id: str, transcript: str, is_final: bool) -> Case:
    case = _require_case(case_id)
    case_store.append_timeline(case, kind="medic", label="Transcript updated" + (" (final)" if is_final else ""))
    return await _coalesced_assess(case_id, transcript)


async def append_transcript(case_id: str, extra_text: str) -> Case:
    """Used by the Photon inbound flow, which appends rather than replaces."""
    case = _require_case(case_id)
    combined = f"{case.transcript}\n{extra_text}".strip() if case.transcript else extra_text.strip()
    return await _coalesced_assess(case_id, combined)


def _item_label(case: Case, item_id: str) -> str:
    pack = protocol_service.get_pack(case.protocol_id)
    for item in pack["items"]:
        if item["id"] == item_id:
            return item["label"]
    return item_id


async def submit_answer(case_id: str, item_id: str, text: str) -> Case:
    case = _require_case(case_id)
    label = _item_label(case, item_id)
    case_store.append_timeline(case, kind="followup", label=f"Answered: {label}", detail=text)
    combined = f"{case.transcript}\n[Follow-up · {label}] {text}".strip()
    return await _coalesced_assess(case_id, combined)


# ---------------------------------------------------------------------------
# Routing
# ---------------------------------------------------------------------------
async def route_case(case_id: str) -> Case:
    case = _require_case(case_id)
    pack = protocol_service.get_pack(case.protocol_id)
    if not pack.get("has_routing"):
        raise RoutingNotSupportedError(case.protocol_id)

    hospitals: list[HospitalStatus] = hospital_service.get_public_hospitals()
    routing = routing_service.route(case.assessment, case.unit_position, hospitals)
    case.routing = routing
    if case.status != "alerted":
        case.status = "routed"
    case_store.append_timeline(
        case,
        kind="routing",
        label=f"Routed to {routing.recommended.hospital.short_name}",
        detail=f"ETA {routing.recommended.eta_minutes} min · LVO suspected={routing.lvo_suspected}",
        latency_ms=routing.decided_in_ms,
    )
    case_store.save_case(case)
    await case_store.publish_case_updated(case)
    return case


# ---------------------------------------------------------------------------
# Confirm / alert
# ---------------------------------------------------------------------------
def _sbar_context_stroke(case: Case, destination: HospitalStatus, eta: int) -> dict:
    a = case.assessment
    active_flags = [f.label for f in (a.flags if a else []) if f.active]
    return {
        "protocol_id": "stroke_race",
        "unit_id": case.unit_id,
        "race_total": a.total if a else None,
        "interpretation_label": a.interpretation.label if a else None,
        "lkw_minutes": (a.extracted.get("lkw_minutes") if a else None),
        "weak_side": (a.extracted.get("weak_side") if a else None),
        "destination": destination.name,
        "eta_minutes": eta,
        "active_flags": active_flags,
        "transcript": case.transcript,
    }


def _sbar_context_medevac(case: Case) -> dict:
    a = case.assessment
    l3 = next((it for it in (a.items if a else [])), None)
    l3 = next((it for it in (a.items if a else []) if it.id == "l3"), None)
    return {
        "protocol_id": "medevac_9line",
        "callsign": (a.extracted.get("callsign") if a else None) or case.unit_id,
        "grid": a.extracted.get("grid") if a else None,
        "precedence_label": (l3.value_label if l3 else None) or "precedence unknown",
        "transcript": case.transcript,
    }


def _format_stroke_team_message(case: Case, destination: HospitalStatus, eta: int, sbar) -> str:
    a = case.assessment
    total_txt = f"{a.total:g}/{a.max_total:g}" if a and a.total is not None else "pending"
    interpretation = a.interpretation.label if a else "pending"
    lines = [
        f"CODE STROKE - Unit {case.unit_id}",
        f"RACE {total_txt} - {interpretation}",
        f"Destination: {destination.name}, ETA {eta} min",
        f"Address: {HOSPITAL_ADDRESSES.get(destination.id, 'n/a')}",
        "",
        f"S: {sbar.situation}",
        f"B: {sbar.background}",
        f"A: {sbar.assessment}",
        f"R: {sbar.recommendation}",
    ]
    return "\n".join(lines)


def _format_medevac_team_message(case: Case, sbar) -> str:
    a = case.assessment
    extracted = a.extracted if a else {}
    items_by_id = {it.id: it for it in (a.items if a else [])}

    def line(item_id: str, num: str) -> str:
        it = items_by_id.get(item_id)
        val = it.value_label if it and it.value_label else "unknown"
        return f"L{num}: {val}"

    lines = [
        "MEDEVAC 9-LINE",
        f"L1 Grid: {extracted.get('grid') or 'unknown'}",
        f"L2 Freq/Callsign: {extracted.get('frequency') or '?'} / {extracted.get('callsign') or 'unknown'}",
        line("l3", "3"),
        line("l4", "4"),
        line("l5", "5"),
        line("l6", "6"),
        line("l7", "7"),
        line("l8", "8"),
        line("l9", "9"),
        "",
        f"S: {sbar.situation}",
        f"B: {sbar.background}",
        f"A: {sbar.assessment}",
        f"R: {sbar.recommendation}",
    ]
    return "\n".join(lines)


async def confirm_case(case_id: str, hospital_id: str | None) -> Case:
    # Local import: breaks the case_service <-> messaging_service import
    # cycle (messaging_service calls into case_service for inbound Photon
    # handling, case_service only needs messaging_service here, at the
    # point an alert is actually sent).
    from services import messaging_service

    case = _require_case(case_id)
    pack = protocol_service.get_pack(case.protocol_id)

    if pack.get("has_routing"):
        if case.routing is None:
            case = await route_case(case_id)
        chosen = case.routing.recommended
        if hospital_id and hospital_id != chosen.hospital.id:
            match = next((o for o in case.routing.options if o.hospital.id == hospital_id), None)
            if match:
                chosen = match
        destination = chosen.hospital
        eta = chosen.eta_minutes
        context = _sbar_context_stroke(case, destination, eta)
        sbar, sbar_source = await llm_service.generate_sbar(context)
        group_name = f"CODE STROKE · Unit {case.unit_id} · ETA {eta}"
        team_text = _format_stroke_team_message(case, destination, eta, sbar)
        alert = Alert(
            hospital_id=destination.id,
            group_name=group_name,
            channel=settings.photon_mode,
            sent_at=case_store.now_iso(),
            eta_minutes=eta,
            sbar=sbar,
            sbar_source=sbar_source,
        )
    else:
        callsign = (case.assessment.extracted.get("callsign") if case.assessment else None) or case.unit_id
        context = _sbar_context_medevac(case)
        sbar, sbar_source = await llm_service.generate_sbar(context)
        group_name = f"MEDEVAC · {callsign}"
        team_text = _format_medevac_team_message(case, sbar)
        alert = Alert(
            hospital_id="",
            group_name=group_name,
            channel=settings.photon_mode,
            sent_at=case_store.now_iso(),
            eta_minutes=0,
            sbar=sbar,
            sbar_source=sbar_source,
        )

    case.alert = alert
    case.status = "alerted"

    participants = settings.stroke_team_handles
    await messaging_service.send_group(name=alert.group_name, participants=participants, text=team_text)
    _append_message(case, thread="team", author="FirstMinute", role="firstminute", text=team_text, kind="alert")

    case_store.append_timeline(
        case, kind="photon", label=f"Team alert sent: {alert.group_name}", detail=f"channel={alert.channel}"
    )
    case_store.save_case(case)
    await case_store.publish_case_updated(case)
    return case


# ---------------------------------------------------------------------------
# Background: reflect hospital status changes into active cases' timelines.
# ---------------------------------------------------------------------------
def _hospital_snapshot() -> dict[str, tuple]:
    return {h.id: (h.ed_status, h.ct_available, h.neuro_ir_available, h.note) for h in hospital_service.get_public_hospitals()}


_last_hospital_snapshot: dict[str, tuple] = _hospital_snapshot()


async def hospital_change_watcher() -> None:
    global _last_hospital_snapshot
    queue = bus.subscribe()
    try:
        while True:
            event = await queue.get()
            if event.get("type") != "hospitals.updated":
                continue
            hospitals = event.get("hospitals", [])
            changed_ids: list[str] = []
            new_snapshot = dict(_last_hospital_snapshot)
            for h in hospitals:
                key = (h["ed_status"], h["ct_available"], h["neuro_ir_available"], h["note"])
                if _last_hospital_snapshot.get(h["id"]) != key:
                    changed_ids.append(h["id"])
                new_snapshot[h["id"]] = key
            _last_hospital_snapshot = new_snapshot
            if not changed_ids:
                continue

            names = ", ".join(h["short_name"] for h in hospitals if h["id"] in changed_ids)
            for case in case_store.list_cases():
                if case.status == "alerted":
                    continue
                if case.protocol_id != "stroke_race":
                    continue
                if case.routing is None:
                    relevant = True
                else:
                    routing_hospital_ids = {case.routing.recommended.hospital.id} | {
                        o.hospital.id for o in case.routing.options
                    }
                    relevant = bool(routing_hospital_ids & set(changed_ids))
                if not relevant:
                    continue
                case_store.append_timeline(case, kind="browser", label=f"Hospital status changed: {names}", detail="via portal scrape")
                case_store.save_case(case)
                await case_store.publish_case_updated(case)
    except asyncio.CancelledError:
        raise
