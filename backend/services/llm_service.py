"""GMI Cloud LLM service: SBAR generation (live chat completion, else a
deterministic template) and optional speech-to-text.
"""
from __future__ import annotations

import json
import logging
from typing import Any

import httpx

from config import settings
from models import SBAR

logger = logging.getLogger(__name__)

SBAR_SYSTEM_PROMPT = (
    "You are an EMS-to-hospital handoff assistant. Given structured, pre-scored assessment "
    "data (not raw clinical judgement - it has already been computed by deterministic code), "
    "write a concise SBAR: Situation, Background, Assessment, Recommendation. Each field must "
    "be at most two sentences, calm clinical tone, no filler, no hedging, numbers over "
    "adjectives. Respond with strict JSON only: "
    '{"situation": str, "background": str, "assessment": str, "recommendation": str}'
)


async def generate_sbar(context: dict[str, Any]) -> tuple[SBAR, str]:
    """Returns (sbar, source) where source is "live" or "simulated"."""
    if settings.GMI_API_KEY and settings.GMI_MODEL:
        try:
            return await _generate_live(context), "live"
        except Exception as exc:  # noqa: BLE001 - any failure falls back to template
            logger.warning("GMI SBAR generation failed (%s); falling back to template SBAR", exc)
    return _generate_template(context), "simulated"


async def _generate_live(context: dict[str, Any]) -> SBAR:
    url = f"{settings.GMI_BASE_URL.rstrip('/')}/chat/completions"
    headers = {"Authorization": f"Bearer {settings.GMI_API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": settings.GMI_MODEL,
        "messages": [
            {"role": "system", "content": SBAR_SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(context)},
        ],
        "temperature": 0.2,
    }
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()
    content = data["choices"][0]["message"]["content"]
    parsed = json.loads(content)
    return SBAR(**parsed)


def _generate_template(context: dict[str, Any]) -> SBAR:
    if context.get("protocol_id") == "stroke_race":
        return _stroke_template(context)
    return _medevac_template(context)


def _stroke_template(context: dict[str, Any]) -> SBAR:
    unit = context.get("unit_id") or "the unit"
    total = context.get("race_total")
    total_txt = f"{total:g}/9" if isinstance(total, (int, float)) else "pending"
    interpretation = context.get("interpretation_label") or "assessment pending"
    lkw = context.get("lkw_minutes")
    weak_side = context.get("weak_side")
    destination = context.get("destination")
    eta = context.get("eta_minutes")
    flags = context.get("active_flags") or []

    situation = f"{unit} inbound with a suspected acute stroke, RACE {total_txt} ({interpretation})."
    lkw_txt = f"Last known well {lkw:g} min ago" if isinstance(lkw, (int, float)) else "Last known well not established"
    side_txt = f", {weak_side}-sided deficit" if weak_side and weak_side != "none_reported" else ""
    background = f"{lkw_txt}{side_txt}."

    assessment = f"RACE {total_txt}"
    assessment += " - LVO suspected." if interpretation == "LVO suspected" else "."
    if flags:
        assessment += " " + "; ".join(flags) + "."

    if destination:
        recommendation = f"Requesting stroke team activation at {destination}, ETA {eta} min."
    else:
        recommendation = "Requesting stroke team activation on arrival."

    return SBAR(situation=situation, background=background, assessment=assessment, recommendation=recommendation)


def _medevac_template(context: dict[str, Any]) -> SBAR:
    callsign = context.get("callsign") or "the requesting unit"
    grid = context.get("grid")
    precedence = context.get("precedence_label") or "precedence unknown"

    situation = f"{callsign} requesting MEDEVAC, {precedence}."
    background = f"Pickup grid {grid}." if grid else "Pickup location pending confirmation."
    assessment = f"9-line MEDEVAC request received, {precedence}."
    recommendation = "Dispatch MEDEVAC per 9-line; confirm marking and security status on final approach."
    return SBAR(situation=situation, background=background, assessment=assessment, recommendation=recommendation)


async def transcribe_audio(data: bytes, filename: str, content_type: str) -> str:
    if not settings.GMI_STT_MODEL:
        raise NotImplementedError("No speech-to-text model configured (GMI_STT_MODEL unset)")
    url = f"{settings.GMI_BASE_URL.rstrip('/')}/audio/transcriptions"
    headers = {"Authorization": f"Bearer {settings.GMI_API_KEY}"}
    files = {"file": (filename, data, content_type or "audio/wav")}
    form = {"model": settings.GMI_STT_MODEL}
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(url, headers=headers, data=form, files=files)
        resp.raise_for_status()
        result = resp.json()
    return result.get("text", "")
