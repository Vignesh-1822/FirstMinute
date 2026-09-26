"""Photon messaging: low-level bridge calls + the inbound conversation flow.

Live mode: PHOTON_BRIDGE_URL set -> POST {bridge}/send and {bridge}/group.
Any bridge failure (connection error, non-2xx) falls back to "simulated":
the message is still stored on the case (console phone mockups render it),
it just isn't actually delivered.
"""
from __future__ import annotations

import logging
import re

import httpx

from config import HOSPITAL_ADDRESSES, settings
from models import Case, CreateCase, InboundMessage
from services import case_service, protocol_service

logger = logging.getLogger(__name__)

# sender handle -> case id, so a medic's next text lands on the same case.
_sender_case: dict[str, str] = {}


async def send(to: str, text: str) -> bool:
    if not settings.PHOTON_BRIDGE_URL or not to:
        return False
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(f"{settings.PHOTON_BRIDGE_URL.rstrip('/')}/send", json={"to": to, "text": text})
        if resp.status_code >= 300:
            logger.warning("Photon /send returned %s", resp.status_code)
            return False
        return True
    except httpx.HTTPError as exc:
        logger.warning("Photon /send failed (%s); message stored only", exc)
        return False


async def send_group(name: str, participants: list[str], text: str) -> str | None:
    if not settings.PHOTON_BRIDGE_URL:
        return None
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{settings.PHOTON_BRIDGE_URL.rstrip('/')}/group",
                json={"name": name, "participants": participants, "text": text},
            )
        if resp.status_code >= 300:
            logger.warning("Photon /group returned %s", resp.status_code)
            return None
        return (resp.json() or {}).get("chat_id")
    except httpx.HTTPError as exc:
        logger.warning("Photon /group failed (%s); team alert stored only", exc)
        return None


def _pick_protocol(text: str) -> str:
    lowered = text.lower()
    if "9-line" in lowered or "9 line" in lowered or "medevac" in lowered:
        return "medevac_9line"
    return "stroke_race"


async def _reply(case: Case, sender: str, text: str) -> None:
    case_service._append_message(case, thread="medic", author="FirstMinute", role="firstminute", text=text, kind="text")
    await send(sender, text)


def _followup_lines(case: Case) -> str:
    a = case.assessment
    lines = []
    for fu in (a.follow_ups if a else []):
        prefix = "not mentioned" if fu.reason == "missing" else "uncertain"
        lines.append(f"{fu.item_id.upper()} {prefix} — {fu.question}")
    return "\n".join(lines)


def _ready_summary(case: Case) -> str:
    a = case.assessment
    pack = protocol_service.get_pack(case.protocol_id)
    if pack.get("has_routing"):
        total = f"{a.total:g}/{a.max_total:g}" if a and a.total is not None else "pending"
        interp = a.interpretation.label if a else "pending"
        lkw = (a.extracted.get("lkw_minutes") if a else None)
        lkw_txt = f"LKW {lkw:g} min" if isinstance(lkw, (int, float)) else "LKW unknown"
        routing = case.routing
        if routing:
            dest = routing.recommended.hospital.name
            address = HOSPITAL_ADDRESSES.get(routing.recommended.hospital.id)
            if address:
                dest = f"{dest} ({address})"
            eta = routing.recommended.eta_minutes
            note = ""
            for o in routing.options:
                if o.hospital.id != routing.recommended.hospital.id and o.hospital.note:
                    note = f" ({o.hospital.short_name}: {o.hospital.note})"
                    break
            return f"RACE {total} · {interp} · {lkw_txt} → {dest}, ETA {eta} min{note}. Reply CONFIRM to pre-alert."
        return f"RACE {total} · {interp} · {lkw_txt}. Reply CONFIRM to pre-alert."
    extracted = a.extracted if a else {}
    items_by_id = {it.id: it for it in (a.items if a else [])}
    l3 = items_by_id.get("l3")
    return (
        f"9-line ready · Grid {extracted.get('grid') or '?'} · {l3.value_label if l3 and l3.value_label else 'precedence unknown'}. "
        "Reply CONFIRM to transmit to MEDEVAC dispatch."
    )


_NEW_CASE_COMMANDS = {"NEW", "RESET", "NEW CASE"}
# A fresh report names the patient ("68 year old", "72 y/o") or a protocol; follow-up answers don't.
_NEW_REPORT_PATTERN = re.compile(r"\b\d{1,3}\s*[- ]?\s*(years?[- ]old|yrs?[- ]old|y/?o)\b|\b9[- ]line\b|\bmedevac\b", re.IGNORECASE)


def _starts_new_report(text: str) -> bool:
    return bool(_NEW_REPORT_PATTERN.search(text))


async def handle_inbound(payload: InboundMessage) -> str:
    if payload.text.strip().upper() in _NEW_CASE_COMMANDS:
        _sender_case.pop(payload.sender, None)
        await send(payload.sender, "New case started. Describe the patient.")
        return ""

    case_id = _sender_case.get(payload.sender)
    case = case_service.case_store.get_case(case_id) if case_id else None
    if case is None or case.status == "alerted" or _starts_new_report(payload.text):
        protocol_id = _pick_protocol(payload.text)
        case = await case_service.create_case(CreateCase(protocol_id=protocol_id, source="photon", unit_id=payload.sender))
        _sender_case[payload.sender] = case.id

    case_service._append_message(case, thread="medic", author=payload.sender, role="medic", text=payload.text, kind="text")

    if payload.text.strip().upper() == "CONFIRM" and case.status in ("ready", "routed"):
        case = await case_service.confirm_case(case.id, None)
        destination = case.alert.hospital_id if case.alert else None
        pack = protocol_service.get_pack(case.protocol_id)
        if pack.get("has_routing") and case.routing:
            hospital = case.routing.recommended.hospital
            address = HOSPITAL_ADDRESSES.get(hospital.id)
            where = f" Head to {address}." if address else ""
            await _reply(case, payload.sender, f"Pre-alert sent to {hospital.short_name} stroke team.{where}")
        else:
            await _reply(case, payload.sender, "Pre-alert sent to MEDEVAC dispatch.")
        return case.id

    if case.assessment and case.assessment.follow_ups:
        case = await case_service.append_transcript(case.id, f"[Follow-up reply] {payload.text}")
    else:
        case = await case_service.append_transcript(case.id, payload.text)

    if case.assessment and case.assessment.follow_ups:
        await _reply(case, payload.sender, _followup_lines(case))
    elif case.status == "ready":
        pack = protocol_service.get_pack(case.protocol_id)
        if pack.get("has_routing"):
            case = await case_service.route_case(case.id)
        await _reply(case, payload.sender, _ready_summary(case))

    return case.id
