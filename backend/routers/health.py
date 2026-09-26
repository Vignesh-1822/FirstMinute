from fastapi import APIRouter

from config import settings
from models import Health, HealthModes

router = APIRouter()


@router.get("/api/health", response_model=Health)
async def health() -> Health:
    return Health(
        status="ok",
        modes=HealthModes(
            jev=settings.jev_mode,
            gmi=settings.gmi_mode,
            browser=settings.browser_mode,
            photon=settings.photon_mode,
        ),
    )
