from fastapi import APIRouter

from models import HospitalStatus
from services import hospital_service

router = APIRouter()


@router.get("/api/hospitals", response_model=list[HospitalStatus])
async def list_hospitals() -> list[HospitalStatus]:
    return hospital_service.get_public_hospitals()


@router.post("/api/hospitals/refresh", response_model=list[HospitalStatus])
async def refresh_hospitals() -> list[HospitalStatus]:
    return await hospital_service.refresh_hospitals()
