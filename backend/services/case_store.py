"""Raw in-memory case storage plus timeline/SSE helpers.

No business logic here (that's case_service.py) - just the dict of cases,
ordering, timestamps, and publishing `case.updated` on the shared event bus.
"""
from __future__ import annotations

from datetime import datetime, timezone

from models import Case, TimelineEvent
from services.event_bus import bus

_cases: dict[str, Case] = {}
_order: list[str] = []


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def add_case(case: Case) -> None:
    _cases[case.id] = case
    _order.append(case.id)


def get_case(case_id: str) -> Case | None:
    return _cases.get(case_id)


def save_case(case: Case) -> None:
    _cases[case.id] = case


def list_cases() -> list[Case]:
    """Newest first."""
    return [_cases[cid] for cid in reversed(_order) if cid in _cases]


def t_ms_since(case: Case) -> int:
    created = datetime.fromisoformat(case.created_at.replace("Z", "+00:00"))
    now = datetime.now(timezone.utc)
    return max(0, int((now - created).total_seconds() * 1000))


def append_timeline(
    case: Case, kind: str, label: str, detail: str | None = None, latency_ms: int | None = None
) -> TimelineEvent:
    event = TimelineEvent(
        at=now_iso(), t_ms=t_ms_since(case), kind=kind, label=label, detail=detail, latency_ms=latency_ms
    )
    case.timeline.append(event)
    return event


async def publish_case_updated(case: Case) -> None:
    await bus.publish({"type": "case.updated", "case": case.model_dump(mode="json")})
