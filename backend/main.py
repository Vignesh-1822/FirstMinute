"""FirstMinute backend entrypoint."""
from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers import cases, events, health, hospitals, photon, portal, protocols, transcribe
from services import case_service, hospital_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_background_tasks: list[asyncio.Task] = []


async def _hospital_poll_loop() -> None:
    while True:
        await asyncio.sleep(settings.HOSPITAL_POLL_SECONDS)
        try:
            await hospital_service.refresh_hospitals()
        except Exception as exc:  # noqa: BLE001
            logger.warning("Hospital poll cycle failed: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _background_tasks.append(asyncio.create_task(_hospital_poll_loop()))
    _background_tasks.append(asyncio.create_task(case_service.hospital_change_watcher()))
    yield
    for task in _background_tasks:
        task.cancel()


app = FastAPI(title="FirstMinute", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(protocols.router)
app.include_router(cases.router)
app.include_router(hospitals.router)
app.include_router(events.router)
app.include_router(photon.router)
app.include_router(portal.router)
app.include_router(transcribe.router)
