"""Code-only regex/date-math extraction.

Per SPEC, Jev never does arithmetic or date math - last-known-well minutes,
glucose, and the MEDEVAC 9-line grid/callsign/frequency (lines 1-2) are all
pulled out of the transcript with plain code, not Jev questions.
"""
from __future__ import annotations

import re
from datetime import datetime, timedelta

_MINUTES_AGO_RE = re.compile(r"(?:last seen normal|last known well|lkw)[^\d]{0,20}(\d+)\s*(?:minutes?|mins?)\s*ago", re.I)
_HOURS_AGO_RE = re.compile(r"(?:last seen normal|last known well|lkw)[^\d]{0,20}(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\s*ago", re.I)
_GENERIC_MIN_AGO_RE = re.compile(r"(\d+)\s*(?:minutes?|mins?)\s*ago", re.I)
_GENERIC_HR_AGO_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\s*ago", re.I)
_LKW_HOURS_RE = re.compile(r"lkw\s*(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)", re.I)
_LKW_CLOCK_RE = re.compile(r"last seen normal at\s*(\d{1,2}):(\d{2})", re.I)

_GLUCOSE_RE = re.compile(r"(?:bgl|glucose)[^\d]{0,10}(\d{2,3})", re.I)

_GRID_RE = re.compile(r"grid\s+([a-z]+(?:\s+[a-z]+)?)\s+((?:\d\s*){4,8})", re.I)
_FREQ_RE = re.compile(r"frequency\s+([\d.]+)", re.I)
_CALLSIGN_RE = re.compile(r"callsign(?:\s+is)?\s+([a-z]+\s+[a-z0-9]+)", re.I)


def extract_lkw_minutes(text: str, now: datetime | None = None) -> int | None:
    """Minutes since last-known-well, or None if not mentioned."""
    now = now or datetime.now()
    m = _MINUTES_AGO_RE.search(text) or _GENERIC_MIN_AGO_RE.search(text)
    if m:
        return int(m.group(1))
    m = _HOURS_AGO_RE.search(text) or _LKW_HOURS_RE.search(text) or _GENERIC_HR_AGO_RE.search(text)
    if m:
        return round(float(m.group(1)) * 60)
    m = _LKW_CLOCK_RE.search(text)
    if m:
        hh, mm = int(m.group(1)), int(m.group(2))
        lkw_time = now.replace(hour=hh, minute=mm, second=0, microsecond=0)
        if lkw_time > now:
            lkw_time -= timedelta(days=1)
        return int((now - lkw_time).total_seconds() // 60)
    return None


def extract_glucose(text: str) -> int | None:
    m = _GLUCOSE_RE.search(text)
    if m:
        return int(m.group(1))
    return None


def extract_grid(text: str) -> str | None:
    m = _GRID_RE.search(text)
    if not m:
        return None
    letters = "".join(word[0].upper() for word in m.group(1).split())
    digits = re.sub(r"\s+", "", m.group(2))
    return f"{letters} {digits}"


def extract_frequency(text: str) -> str | None:
    m = _FREQ_RE.search(text)
    return m.group(1) if m else None


def extract_callsign(text: str) -> str | None:
    m = _CALLSIGN_RE.search(text)
    return m.group(1).strip() if m else None
