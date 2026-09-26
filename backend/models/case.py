from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel

from .assessment import Assessment
from .common import Mode, Point
from .hospital import Routing

CaseStatus = Literal["listening", "needs_info", "ready", "routed", "alerted"]


class Message(BaseModel):
    id: str
    thread: Literal["medic", "team"]
    author: str
    role: Literal["medic", "firstminute", "hospital"]
    text: str
    kind: Literal["text", "alert", "location"]
    at: str


class SBAR(BaseModel):
    situation: str
    background: str
    assessment: str
    recommendation: str


class Alert(BaseModel):
    hospital_id: str
    group_name: str
    channel: Mode
    sent_at: str
    eta_minutes: int
    sbar: SBAR
    sbar_source: Mode


class TimelineEvent(BaseModel):
    at: str
    t_ms: int
    kind: Literal["jev", "routing", "browser", "photon", "llm", "followup", "medic"]
    label: str
    detail: Optional[str] = None
    latency_ms: Optional[int] = None


class CreateCase(BaseModel):
    protocol_id: str
    source: Literal["console", "photon"]
    unit_id: Optional[str] = None
    unit_position: Optional[Point] = None


class Case(BaseModel):
    id: str
    protocol_id: str
    source: Literal["console", "photon"]
    created_at: str
    unit_id: str
    unit_position: Optional[Point] = None
    transcript: str = ""
    status: CaseStatus = "listening"
    assessment: Optional[Assessment] = None
    routing: Optional[Routing] = None
    alert: Optional[Alert] = None
    messages: list[Message] = []
    timeline: list[TimelineEvent] = []


class TranscriptUpdate(BaseModel):
    transcript: str
    is_final: bool = False


class AnswerSubmission(BaseModel):
    item_id: str
    text: str


class ConfirmRequest(BaseModel):
    hospital_id: Optional[str] = None


class InboundMessage(BaseModel):
    sender: str
    text: str
    chat_id: Optional[str] = None
    attachment_url: Optional[str] = None
    simulated: Optional[bool] = None
