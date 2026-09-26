from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

EdStatus = Literal["open", "advisory", "diversion"]


class HospitalStatus(BaseModel):
    id: str
    name: str
    short_name: str
    level: Literal["CSC", "TSC", "PSC", "ASRH"]
    x: float
    y: float
    ed_status: EdStatus
    ct_available: bool
    neuro_ir_available: bool
    note: str
    last_checked: str
    source: Literal["browserbase", "direct"]


class HospitalOption(BaseModel):
    hospital: HospitalStatus
    eta_minutes: int
    eligible: bool
    thrombectomy_capable: bool
    reasons: list[str]


class Routing(BaseModel):
    recommended: HospitalOption
    options: list[HospitalOption]
    lvo_suspected: bool
    rule_trace: list[str]
    decided_in_ms: int


class HospitalUpdateForm(BaseModel):
    """Mirrors the fields the /portal HTML form posts (as form data)."""

    ed_status: EdStatus
    ct_available: bool
    neuro_ir_available: bool
    note: str = ""
