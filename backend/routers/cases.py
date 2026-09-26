from fastapi import APIRouter, HTTPException

from models import AnswerSubmission, Case, ConfirmRequest, CreateCase, TranscriptUpdate
from services import case_service

router = APIRouter()


@router.post("/api/cases", response_model=Case)
async def create_case(payload: CreateCase) -> Case:
    try:
        return await case_service.create_case(payload)
    except KeyError:
        raise HTTPException(status_code=400, detail=f"Unknown protocol_id: {payload.protocol_id}")


@router.get("/api/cases", response_model=list[Case])
async def list_cases() -> list[Case]:
    return case_service.list_cases()


@router.get("/api/cases/{case_id}", response_model=Case)
async def get_case(case_id: str) -> Case:
    try:
        return case_service.get_case(case_id)
    except case_service.CaseNotFoundError:
        raise HTTPException(status_code=404, detail="Case not found")


@router.post("/api/cases/{case_id}/transcript", response_model=Case)
async def update_transcript(case_id: str, payload: TranscriptUpdate) -> Case:
    try:
        return await case_service.set_transcript(case_id, payload.transcript, payload.is_final)
    except case_service.CaseNotFoundError:
        raise HTTPException(status_code=404, detail="Case not found")


@router.post("/api/cases/{case_id}/answers", response_model=Case)
async def submit_answer(case_id: str, payload: AnswerSubmission) -> Case:
    try:
        return await case_service.submit_answer(case_id, payload.item_id, payload.text)
    except case_service.CaseNotFoundError:
        raise HTTPException(status_code=404, detail="Case not found")


@router.post("/api/cases/{case_id}/route", response_model=Case)
async def route_case(case_id: str) -> Case:
    try:
        return await case_service.route_case(case_id)
    except case_service.CaseNotFoundError:
        raise HTTPException(status_code=404, detail="Case not found")
    except case_service.RoutingNotSupportedError:
        raise HTTPException(status_code=409, detail="This protocol pack does not support hospital routing")


@router.post("/api/cases/{case_id}/confirm", response_model=Case)
async def confirm_case(case_id: str, payload: ConfirmRequest) -> Case:
    try:
        return await case_service.confirm_case(case_id, payload.hospital_id)
    except case_service.CaseNotFoundError:
        raise HTTPException(status_code=404, detail="Case not found")
