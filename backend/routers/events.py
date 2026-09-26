import asyncio
import json

from fastapi import APIRouter
from starlette.responses import StreamingResponse

from services.event_bus import bus

router = APIRouter()


async def _event_stream():
    queue = bus.subscribe()
    try:
        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=15.0)
                yield f"data: {json.dumps(event)}\n\n"
            except asyncio.TimeoutError:
                yield ": ping\n\n"
    finally:
        bus.unsubscribe(queue)


@router.get("/api/events")
async def events() -> StreamingResponse:
    return StreamingResponse(_event_stream(), media_type="text/event-stream")
