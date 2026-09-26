from fastapi import APIRouter

from models import InboundMessage
from services import messaging_service

router = APIRouter()


@router.post("/api/photon/inbound")
async def photon_inbound(payload: InboundMessage) -> dict:
    case_id = await messaging_service.handle_inbound(payload)
    return {"ok": True, "case_id": case_id}
