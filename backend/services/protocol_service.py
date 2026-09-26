"""Loads protocol packs and demo scenarios from backend/data/."""
from __future__ import annotations

import json
from functools import lru_cache

from config import PROTOCOLS_DIR, SCENARIOS_FILE
from models import Protocol, Scenario

PACK_IDS = ["stroke_race", "medevac_9line"]


@lru_cache(maxsize=None)
def _load_pack_raw(protocol_id: str) -> dict:
    path = PROTOCOLS_DIR / f"{protocol_id}.json"
    return json.loads(path.read_text())


def get_pack(protocol_id: str) -> dict:
    """Raw pack dict (includes backend-only fields like jev_question)."""
    if protocol_id not in PACK_IDS:
        raise KeyError(protocol_id)
    return _load_pack_raw(protocol_id)


def list_packs_raw() -> list[dict]:
    return [_load_pack_raw(pid) for pid in PACK_IDS]


def list_protocols() -> list[Protocol]:
    return [Protocol(**pack) for pack in list_packs_raw()]


@lru_cache(maxsize=None)
def _load_scenarios_raw() -> tuple[dict, ...]:
    return tuple(json.loads(SCENARIOS_FILE.read_text()))


def list_scenarios() -> list[Scenario]:
    return [Scenario(**s) for s in _load_scenarios_raw()]


def get_scenario(scenario_id: str) -> Scenario | None:
    for s in list_scenarios():
        if s.id == scenario_id:
            return s
    return None
