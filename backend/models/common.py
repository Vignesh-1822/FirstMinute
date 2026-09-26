"""Shared primitives used across request/response models."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

Mode = Literal["live", "simulated"]


class Point(BaseModel):
    x: float
    y: float


class Health(BaseModel):
    status: Literal["ok"] = "ok"
    modes: "HealthModes"


class HealthModes(BaseModel):
    jev: Mode
    gmi: Mode
    browser: Literal["browserbase", "direct"]
    photon: Mode


Health.model_rebuild()
