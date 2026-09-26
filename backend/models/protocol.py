from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel

from .common import Point


class ProtocolItem(BaseModel):
    id: str
    label: str
    kind: Literal["score", "choice"]
    levels: list[str]
    follow_up: str


class Protocol(BaseModel):
    id: Literal["stroke_race", "medevac_9line"]
    name: str
    short: str
    description: str
    max_score: Optional[int] = None
    has_routing: bool
    items: list[ProtocolItem]


class Scenario(BaseModel):
    id: str
    protocol_id: str
    title: str
    subtitle: str
    transcript: str
    unit_position: Optional[Point] = None
    follow_up_answers: dict[str, str] = {}
