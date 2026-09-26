from fastapi import APIRouter

from models import Protocol, Scenario
from services import protocol_service

router = APIRouter()


@router.get("/api/protocols", response_model=list[Protocol])
async def list_protocols() -> list[Protocol]:
    return protocol_service.list_protocols()


@router.get("/api/scenarios", response_model=list[Scenario])
async def list_scenarios() -> list[Scenario]:
    return protocol_service.list_scenarios()
