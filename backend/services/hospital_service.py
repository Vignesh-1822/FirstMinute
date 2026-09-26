"""In-memory hospital status store, the /portal HTML board, and the poller
that keeps the "public" (scraped) copy of hospital status in sync with what
was typed into the portal.

Two layers, on purpose - this is what makes the Browserbase/Stagehand path
meaningful instead of a no-op:
  - `_portal_store`: ground truth, mutated directly by POST /portal/hospitals/{id}.
  - `_public_store`: what routing/the console actually reads, refreshed only
    by scraping /portal (browserbase or direct), so `source` and
    `last_checked` genuinely reflect the last successful scrape.
"""
from __future__ import annotations

import html
import logging
from datetime import datetime, timezone

import httpx
from bs4 import BeautifulSoup

from config import HOSPITAL_DEFAULT_OVERRIDES, HOSPITALS_SEED, settings
from models import HospitalStatus
from services.event_bus import bus

logger = logging.getLogger(__name__)

ED_STATUS_OPTIONS = ["open", "advisory", "diversion"]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _seed_store(source: str) -> dict[str, HospitalStatus]:
    now = _now_iso()
    store: dict[str, HospitalStatus] = {}
    for row in HOSPITALS_SEED:
        overrides = HOSPITAL_DEFAULT_OVERRIDES.get(row["id"], {})
        store[row["id"]] = HospitalStatus(
            id=row["id"],
            name=row["name"],
            short_name=row["short_name"],
            level=row["level"],
            x=row["x"],
            y=row["y"],
            ed_status="open",
            ct_available=True,
            neuro_ir_available=overrides.get("neuro_ir_available", True),
            note=overrides.get("note", ""),
            last_checked=now,
            source=source,
        )
    return store


_portal_store: dict[str, HospitalStatus] = _seed_store("direct")
_public_store: dict[str, HospitalStatus] = dict(_portal_store)


def _ordered(store: dict[str, HospitalStatus]) -> list[HospitalStatus]:
    return [store[row["id"]] for row in HOSPITALS_SEED if row["id"] in store]


def get_public_hospitals() -> list[HospitalStatus]:
    return _ordered(_public_store)


def get_portal_hospitals() -> list[HospitalStatus]:
    return _ordered(_portal_store)


def get_hospital(hospital_id: str) -> HospitalStatus | None:
    return _public_store.get(hospital_id)


def update_portal_hospital(
    hospital_id: str, ed_status: str, ct_available: bool, neuro_ir_available: bool, note: str
) -> HospitalStatus:
    current = _portal_store[hospital_id]
    updated = current.model_copy(
        update={
            "ed_status": ed_status,
            "ct_available": ct_available,
            "neuro_ir_available": neuro_ir_available,
            "note": note,
            "last_checked": _now_iso(),
            "source": "direct",
        }
    )
    _portal_store[hospital_id] = updated
    return updated


# ---------------------------------------------------------------------------
# /portal HTML - a plain, credible "government EMS resource board"
# ---------------------------------------------------------------------------
def render_portal_html(hospitals: list[HospitalStatus]) -> str:
    def esc(v: str) -> str:
        return html.escape(v, quote=True)

    rows = []
    for h in hospitals:
        ed_options = "".join(
            f'<option value="{s}"{" selected" if s == h.ed_status else ""}>{s.capitalize()}</option>'
            for s in ED_STATUS_OPTIONS
        )
        rows.append(f"""
        <tr data-hospital-id="{h.id}" data-ed-status="{h.ed_status}"
            data-ct-available="{str(h.ct_available).lower()}"
            data-neuro-ir-available="{str(h.neuro_ir_available).lower()}"
            data-note="{esc(h.note)}" data-last-checked="{h.last_checked}">
          <td class="name">{esc(h.name)}<span class="short">{esc(h.short_name)}</span></td>
          <td class="level"><span class="badge">{h.level}</span></td>
          <td><span class="dot dot-{h.ed_status}"></span>{h.ed_status.capitalize()}</td>
          <td>{"Yes" if h.ct_available else "No"}</td>
          <td>{"Yes" if h.neuro_ir_available else "No"}</td>
          <td class="note">{esc(h.note) or "&mdash;"}</td>
          <td class="ts">{h.last_checked}</td>
          <td>
            <form method="post" action="/portal/hospitals/{h.id}">
              <select name="ed_status">{ed_options}</select><br/>
              <label><input type="checkbox" name="ct_available" value="true" {"checked" if h.ct_available else ""}/> CT</label>
              <label><input type="checkbox" name="neuro_ir_available" value="true" {"checked" if h.neuro_ir_available else ""}/> Neuro IR</label><br/>
              <input type="text" name="note" value="{esc(h.note)}" placeholder="note" size="18"/>
              <button type="submit">Update</button>
            </form>
          </td>
        </tr>""")

    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Riverton Regional EMS Resource Board</title>
<style>
  :root {{ color-scheme: light; }}
  * {{ box-sizing: border-box; }}
  body {{ margin: 0; background: #eef1f4; font-family: "Segoe UI", Tahoma, Arial, sans-serif; color: #1c2530; }}
  header {{ background: #0b3d63; color: #fff; padding: 14px 24px; border-bottom: 4px solid #0a2e4a; }}
  header h1 {{ margin: 0; font-size: 18px; font-weight: 600; letter-spacing: 0.02em; }}
  header p {{ margin: 4px 0 0; font-size: 12px; color: #cfe0ee; }}
  main {{ padding: 20px 24px 48px; }}
  .panel {{ background: #fff; border: 1px solid #c9d2db; border-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.06); }}
  .panel-header {{ padding: 10px 16px; border-bottom: 1px solid #dde3e9; font-size: 13px; font-weight: 600; color: #38424c; background: #f6f8fa; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 13px; }}
  th {{ text-align: left; background: #f0f3f6; padding: 8px 10px; border-bottom: 2px solid #c9d2db; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #55606b; }}
  td {{ padding: 8px 10px; border-bottom: 1px solid #e5e9ed; vertical-align: top; }}
  tr:last-child td {{ border-bottom: none; }}
  .name {{ display: flex; flex-direction: column; font-weight: 600; }}
  .name .short {{ font-weight: 400; font-size: 11px; color: #6b7682; }}
  .badge {{ display: inline-block; padding: 1px 6px; border: 1px solid #97a4b0; border-radius: 3px; font-size: 11px; font-weight: 600; color: #38424c; }}
  .dot {{ display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }}
  .dot-open {{ background: #2f9e5c; }}
  .dot-advisory {{ background: #c98a1f; }}
  .dot-diversion {{ background: #c23b3b; }}
  .note {{ max-width: 160px; color: #55606b; }}
  .ts {{ font-family: "Consolas", monospace; font-size: 11px; color: #6b7682; white-space: nowrap; }}
  form {{ display: flex; flex-direction: column; gap: 4px; min-width: 150px; }}
  form select, form input[type=text] {{ font-size: 12px; padding: 2px 4px; }}
  form label {{ font-size: 11px; }}
  form button {{ font-size: 11px; padding: 3px 8px; background: #0b3d63; color: #fff; border: none; border-radius: 3px; cursor: pointer; }}
  footer {{ padding: 10px 24px; font-size: 11px; color: #8a94a0; }}
</style>
</head>
<body>
<header>
  <h1>Riverton Regional EMS Resource Board</h1>
  <p>Riverton County EMS Authority &middot; Hospital Resource Status &middot; For dispatch and field use only</p>
</header>
<main>
  <div class="panel">
    <div class="panel-header">Regional Hospital Status</div>
    <table>
      <thead>
        <tr>
          <th>Facility</th><th>Level</th><th>ED Status</th><th>CT</th><th>Neuro IR</th><th>Note</th><th>Last Updated</th><th>Update</th>
        </tr>
      </thead>
      <tbody>
        {"".join(rows)}
      </tbody>
    </table>
  </div>
</main>
<footer>Synthetic data - FirstMinute demo. Not a real regional resource board.</footer>
</body>
</html>"""


# ---------------------------------------------------------------------------
# Scraping - direct (self-HTTP + BeautifulSoup) and browserbase (Stagehand)
# ---------------------------------------------------------------------------
async def _scrape_direct() -> list[HospitalStatus]:
    url = f"{settings.SELF_BASE_URL.rstrip('/')}/portal"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    seed_by_id = {row["id"]: row for row in HOSPITALS_SEED}
    now = _now_iso()
    results: list[HospitalStatus] = []
    for tr in soup.select("tr[data-hospital-id]"):
        hid = tr.get("data-hospital-id")
        seed = seed_by_id.get(hid)
        if not seed:
            continue
        results.append(
            HospitalStatus(
                id=hid,
                name=seed["name"],
                short_name=seed["short_name"],
                level=seed["level"],
                x=seed["x"],
                y=seed["y"],
                ed_status=tr.get("data-ed-status", "open"),
                ct_available=tr.get("data-ct-available") == "true",
                neuro_ir_available=tr.get("data-neuro-ir-available") == "true",
                note=tr.get("data-note", "") or "",
                last_checked=now,
                source="direct",
            )
        )
    if not results:
        raise RuntimeError("Direct scrape found no hospital rows in /portal HTML")
    return results


async def _scrape_browserbase() -> list[HospitalStatus]:
    # Lazy import: the `stagehand` package is optional and only needed for
    # this live path. If it's missing, or Browserbase/the extract call fails
    # for any reason, the caller falls back to `_scrape_direct`.
    from stagehand import AsyncStagehand  # type: ignore

    client = AsyncStagehand(
        browserbase_api_key=settings.BROWSERBASE_API_KEY,
        model_api_key=settings.STAGEHAND_MODEL_API_KEY or settings.GMI_API_KEY,
    )
    session = await client.sessions.create()
    try:
        portal_url = settings.PORTAL_PUBLIC_URL.rstrip("/") + "/portal"
        await session.navigate(url=portal_url)
        response = await session.extract(
            instruction=(
                "Extract every hospital row from the Riverton Regional EMS Resource Board table: "
                "its id (from the row's data-hospital-id attribute), ed_status "
                "(open, advisory, or diversion), ct_available (true/false), "
                "neuro_ir_available (true/false), and note."
            ),
            schema={
                "type": "object",
                "properties": {
                    "hospitals": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "id": {"type": "string"},
                                "ed_status": {"type": "string"},
                                "ct_available": {"type": "boolean"},
                                "neuro_ir_available": {"type": "boolean"},
                                "note": {"type": "string"},
                            },
                            "required": ["id", "ed_status", "ct_available", "neuro_ir_available"],
                        },
                    }
                },
                "required": ["hospitals"],
            },
        )
        rows = (response.data.result or {}).get("hospitals", [])
    finally:
        await session.end()

    seed_by_id = {row["id"]: row for row in HOSPITALS_SEED}
    now = _now_iso()
    results: list[HospitalStatus] = []
    for row in rows:
        seed = seed_by_id.get(row.get("id"))
        if not seed:
            continue
        results.append(
            HospitalStatus(
                id=seed["id"],
                name=seed["name"],
                short_name=seed["short_name"],
                level=seed["level"],
                x=seed["x"],
                y=seed["y"],
                ed_status=row["ed_status"],
                ct_available=bool(row["ct_available"]),
                neuro_ir_available=bool(row["neuro_ir_available"]),
                note=row.get("note", "") or "",
                last_checked=now,
                source="browserbase",
            )
        )
    if not results:
        raise RuntimeError("Browserbase extract returned no hospital rows")
    return results


def _status_tuple(h: HospitalStatus) -> tuple:
    return (h.ed_status, h.ct_available, h.neuro_ir_available, h.note)


async def refresh_hospitals() -> list[HospitalStatus]:
    """Scrape /portal (browserbase, else direct) and refresh `_public_store`.

    Publishes `hospitals.updated` on the shared event bus only if something
    actually changed, exactly matching the SSE contract shape.
    """
    fresh: list[HospitalStatus] | None = None
    if settings.browser_mode == "browserbase":
        try:
            fresh = await _scrape_browserbase()
        except Exception as exc:  # noqa: BLE001 - any failure falls back to direct
            logger.warning("Browserbase scrape failed (%s); falling back to direct HTML scrape", exc)

    if fresh is None:
        try:
            fresh = await _scrape_direct()
        except Exception as exc:  # noqa: BLE001
            logger.error("Direct portal scrape failed: %s", exc)
            return get_public_hospitals()

    changed = False
    for h in fresh:
        prev = _public_store.get(h.id)
        if prev is None or _status_tuple(prev) != _status_tuple(h):
            changed = True
        _public_store[h.id] = h

    hospitals = get_public_hospitals()
    if changed:
        await bus.publish({"type": "hospitals.updated", "hospitals": [h.model_dump() for h in hospitals]})
    return hospitals
