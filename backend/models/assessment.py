from __future__ import annotations

from typing import Literal, Optional, Union

from pydantic import BaseModel

from .common import Mode

ItemStatus = Literal["confident", "uncertain", "missing"]


class ItemResult(BaseModel):
    id: str
    label: str
    value: Optional[float] = None
    value_label: Optional[str] = None
    probabilities: dict[str, float] = {}
    confidence: float
    mentioned: float
    status: ItemStatus


class Flag(BaseModel):
    id: str
    label: str
    probability: float
    active: bool
    source: Literal["jev", "code"]


class FollowUp(BaseModel):
    item_id: str
    question: str
    reason: Literal["missing", "uncertain"]


class JevCallStats(BaseModel):
    mode: Mode
    model: str
    latency_ms: int
    questions: int
    input_tokens: int
    cost_usd: float


class Interpretation(BaseModel):
    label: str
    severity: Literal["low", "moderate", "high"]


class Assessment(BaseModel):
    items: list[ItemResult]
    total: Optional[float] = None
    max_total: Optional[float] = None
    interpretation: Interpretation
    extracted: dict[str, Union[str, float, None]] = {}
    flags: list[Flag] = []
    follow_ups: list[FollowUp] = []
    jev: JevCallStats
    computed_at: str
