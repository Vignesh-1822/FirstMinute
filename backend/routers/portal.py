from fastapi import APIRouter, Form
from fastapi.responses import HTMLResponse, RedirectResponse

from services import hospital_service

router = APIRouter()


@router.get("/portal", response_class=HTMLResponse)
async def portal() -> HTMLResponse:
    return HTMLResponse(hospital_service.render_portal_html(hospital_service.get_portal_hospitals()))


@router.post("/portal/hospitals/{hospital_id}")
async def update_portal_hospital(
    hospital_id: str,
    ed_status: str = Form("open"),
    ct_available: bool = Form(False),
    neuro_ir_available: bool = Form(False),
    note: str = Form(""),
) -> RedirectResponse:
    hospital_service.update_portal_hospital(hospital_id, ed_status, ct_available, neuro_ir_available, note)
    return RedirectResponse(url="/portal", status_code=303)
