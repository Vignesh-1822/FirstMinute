from fastapi import APIRouter, File, HTTPException, UploadFile

from services import llm_service

router = APIRouter()


@router.post("/api/transcribe")
async def transcribe(audio: UploadFile = File(...)) -> dict:
    try:
        data = await audio.read()
        text = await llm_service.transcribe_audio(data, audio.filename or "audio.wav", audio.content_type or "")
        return {"text": text}
    except NotImplementedError as exc:
        raise HTTPException(status_code=501, detail=str(exc))
