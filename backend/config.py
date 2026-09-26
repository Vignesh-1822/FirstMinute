"""Central settings and the deterministic ROUTING_POLICY dict.

Every environment variable is read here, once, via python-dotenv. Nothing else
in the codebase should call os.getenv directly - import `settings` from this
module instead so there's a single source of truth for configuration.
"""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

DATA_DIR = BASE_DIR / "data"
PROTOCOLS_DIR = DATA_DIR / "protocols"
SCENARIOS_FILE = DATA_DIR / "scenarios.json"


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default)


def _env_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        return int(raw)
    except ValueError:
        return default


class Settings:
    # --- Jev (TypeSafe System One) ---
    TYPESAFE_API_KEY: str = _env("TYPESAFE_API_KEY")
    JEV_MODEL: str = _env("JEV_MODEL", "jev-latest")
    JEV_PRICE_PER_M_INPUT: float = _env_float("JEV_PRICE_PER_M_INPUT", 0.042)
    JEV_API_URL: str = "https://api.typesafe.ai/v1/systemone"

    # --- GMI Cloud (LLM SBAR + optional STT) ---
    GMI_API_KEY: str = _env("GMI_API_KEY")
    GMI_BASE_URL: str = _env("GMI_BASE_URL", "https://api.gmi-serving.com/v1")
    GMI_MODEL: str = _env("GMI_MODEL")
    GMI_STT_MODEL: str = _env("GMI_STT_MODEL")

    # --- Browserbase + Stagehand (hospital portal scraping) ---
    BROWSERBASE_API_KEY: str = _env("BROWSERBASE_API_KEY")
    BROWSERBASE_PROJECT_ID: str = _env("BROWSERBASE_PROJECT_ID")
    STAGEHAND_MODEL_API_KEY: str = _env("STAGEHAND_MODEL_API_KEY")
    PORTAL_PUBLIC_URL: str = _env("PORTAL_PUBLIC_URL")
    HOSPITAL_POLL_SECONDS: int = _env_int("HOSPITAL_POLL_SECONDS", 20)

    # --- Photon messaging bridge ---
    PHOTON_BRIDGE_URL: str = _env("PHOTON_BRIDGE_URL")
    STROKE_TEAM_HANDLES: str = _env("STROKE_TEAM_HANDLES")

    # --- CORS ---
    FRONTEND_ORIGIN: str = _env("FRONTEND_ORIGIN", "http://localhost:5173")

    # --- Self-referential URL, used by the "direct" portal scrape mode ---
    SELF_BASE_URL: str = _env("SELF_BASE_URL", "http://127.0.0.1:8000")

    @property
    def jev_mode(self) -> str:
        return "live" if self.TYPESAFE_API_KEY else "simulated"

    @property
    def gmi_mode(self) -> str:
        return "live" if (self.GMI_API_KEY and self.GMI_MODEL) else "simulated"

    @property
    def photon_mode(self) -> str:
        return "live" if self.PHOTON_BRIDGE_URL else "simulated"

    @property
    def browser_mode(self) -> str:
        return "browserbase" if (self.BROWSERBASE_API_KEY and self.PORTAL_PUBLIC_URL) else "direct"

    @property
    def stroke_team_handles(self) -> list[str]:
        return [h.strip() for h in self.STROKE_TEAM_HANDLES.split(",") if h.strip()]


settings = Settings()


# ---------------------------------------------------------------------------
# Deterministic routing configuration. Jev only ever scores; every threshold
# and formula that turns those scores into a destination lives here, in one
# place, so the rule_trace can cite exact numbers.
# ---------------------------------------------------------------------------
ROUTING_POLICY: dict = {
    # RACE >= this total => LVO suspected.
    "lvo_race_threshold": 5,
    # Acute window: LVO + LKW <= this many hours => prefer thrombectomy-capable
    # only if the detour over the nearest eligible stroke hospital is small.
    "acute_lkw_hours": 4.5,
    "acute_max_detour_minutes": 15,
    # Extended window: LVO + LKW between acute and this many hours => prefer
    # thrombectomy-capable only if its absolute ETA is still short.
    "extended_lkw_hours": 24.0,
    "extended_max_thrombectomy_eta_minutes": 60,
    # ETA formula: round(euclidean_km / speed_km_per_min + offset_minutes)
    # 54 km/h lights-and-sirens => 0.9 km/min, plus a fixed offload/turnover.
    "eta_speed_km_per_min": 0.9,
    "eta_offset_minutes": 2,
    # Item status thresholds shared by every protocol pack.
    "mentioned_missing_threshold": 0.5,
    "confidence_uncertain_threshold": 0.6,
    # Hypoglycemia mimic: glucose (mg/dL) below this triggers the flag.
    "hypoglycemia_glucose_threshold": 60,
}


HOSPITALS_SEED: list[dict] = [
    {"id": "mercy", "name": "Mercy General Hospital", "short_name": "Mercy", "level": "CSC", "x": 13.5, "y": 4.0},
    {"id": "stluke", "name": "St. Luke's Medical Center", "short_name": "St. Luke's", "level": "TSC", "x": 5.0, "y": 9.5},
    {"id": "riverside", "name": "Riverside Community Hospital", "short_name": "Riverside", "level": "PSC", "x": 8.5, "y": 6.0},
    {"id": "northgate", "name": "Northgate Hospital", "short_name": "Northgate", "level": "PSC", "x": 16.5, "y": 11.0},
    {"id": "harbor", "name": "Harbor Valley Medical", "short_name": "Harbor Valley", "level": "ASRH", "x": 2.5, "y": 3.0},
]

# Defaults per SPEC: everything open, CT + neuro IR available, except St.
# Luke's whose angio suite is occupied - this is what makes the LVO demo
# scenario reroute from the nearest thrombectomy-capable hospital to Mercy.
HOSPITAL_DEFAULT_OVERRIDES: dict = {
    "stluke": {"neuro_ir_available": False, "note": "Angio suite occupied"},
}
