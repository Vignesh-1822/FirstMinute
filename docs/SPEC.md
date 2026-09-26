# FirstMinute — Build Spec (shared contract for all workstreams)

> "Pulsara and JoinTriage digitized the paper stroke form. FirstMinute deletes it."

A paramedic describes the patient in plain speech (voice or text, in the console or over iMessage).
FirstMinute scores a validated stroke scale item-by-item with **Jev** (TypeSafe System One), asks back
**only** the items it is unsure about, picks a destination using **live hospital status** scraped by
**Browserbase + Stagehand**, and — after the medic confirms — opens a **CODE STROKE** group chat with the
stroke team over **Photon**, with an SBAR handoff written by an LLM on **GMI Cloud**.
Same engine runs other "protocol packs" (9-Line MEDEVAC included as the second pack).

Principles (these show up in UI copy too):
- Jev scores; **deterministic code decides** (routing thresholds live in one config dict). Jev never does arithmetic or date math.
- Calibrated confidence drives behaviour: confident → accept, uncertain → confirm, not mentioned → ask.
- The medic always confirms. Decision support, not autonomy. Synthetic data only.
- Every integration has a **live** mode (env key present) and a **simulated** mode that is labelled as such in the UI. Never pretend a simulated call is live.

## Repo layout

```
jevathon/
├── backend/     FastAPI (Python 3.10, venv at backend/venv)       port 8000
├── frontend/    React + Vite + TS + Tailwind v4 + shadcn/ui        port 5173
├── messaging/   Photon Spectrum bridge (TypeScript, Node 22)       port 8787
├── video/       Remotion marketing video
└── docs/SPEC.md (this file)
```
Node: use Node 22 (`source ~/.nvm/nvm.sh && nvm use 22`). System default is 18 — too old for Vite 6 / Tailwind v4.

## Environment variables (backend/.env.example)

```
TYPESAFE_API_KEY=            # Jev live mode when set, else simulated
JEV_MODEL=jev-latest
JEV_PRICE_PER_M_INPUT=0.042  # USD per 1M input tokens (output free)
GMI_API_KEY=                 # GMI live mode when set, else template SBAR
GMI_BASE_URL=https://api.gmi-serving.com/v1
GMI_MODEL=                   # chat model id from GMI model library
GMI_STT_MODEL=               # optional speech-to-text model id
BROWSERBASE_API_KEY=         # browserbase mode when set, else "direct" HTML scrape
BROWSERBASE_PROJECT_ID=
STAGEHAND_MODEL_API_KEY=     # LLM key Stagehand uses for extract()
PORTAL_PUBLIC_URL=           # public URL of /portal (Browserbase cannot reach localhost; use ngrok)
HOSPITAL_POLL_SECONDS=20
PHOTON_BRIDGE_URL=           # e.g. http://localhost:8787 ; empty => simulated messaging
STROKE_TEAM_HANDLES=         # comma-separated phone numbers/emails for the CODE STROKE group
FRONTEND_ORIGIN=http://localhost:5173
```

## Domain data

### Hospitals (fictional city "Riverton" — never use real hospital names)
Coordinates are km on a 20×14 km city grid (x east, y south), origin top-left.

| id | name | short | level | x | y |
|---|---|---|---|---|---|
| mercy | Mercy General Hospital | Mercy | CSC | 13.5 | 4.0 |
| stluke | St. Luke's Medical Center | St. Luke's | TSC | 5.0 | 9.5 |
| riverside | Riverside Community Hospital | Riverside | PSC | 8.5 | 6.0 |
| northgate | Northgate Hospital | Northgate | PSC | 16.5 | 11.0 |
| harbor | Harbor Valley Medical | Harbor Valley | ASRH | 2.5 | 3.0 |

Levels: CSC = comprehensive (thrombectomy 24/7), TSC = thrombectomy-capable, PSC = primary (tPA, no thrombectomy), ASRH = acute stroke ready.
Thrombectomy-capable = CSC or TSC **and** `neuro_ir_available`.
ETA minutes = `round(euclidean_km / 0.9 + 2)` (≈54 km/h lights-and-sirens + 2 min offload). Keep the formula in config.

Default statuses: all open, CT available, neuro IR available — except `stluke.neuro_ir_available=false` ("angio suite occupied") so the demo shows a live-status-driven reroute. The portal lets you flip any flag.

### Routing rules (all numbers in one `ROUTING_POLICY` dict)
1. Exclude hospitals with `ed_status == "diversion"` or `ct_available == false`.
2. `lvo_suspected = race_total >= 5`.
3. If LVO suspected and LKW ≤ 4.5 h: go to nearest thrombectomy-capable hospital **if** its ETA − ETA(nearest eligible stroke-capable hospital) ≤ 15 min; else nearest eligible.
4. If LVO suspected and 4.5 h < LKW ≤ 24 h: nearest thrombectomy-capable if ETA ≤ 60 min; else nearest eligible.
5. Otherwise (no LVO, or LKW unknown/ > 24 h): nearest eligible stroke-capable hospital (any level).
6. Produce a human-readable `rule_trace` (list of short strings) explaining every step, e.g. "RACE 7 ≥ 5 → LVO suspected", "St. Luke's excluded: neuro IR unavailable (portal, 12s ago)".

### Stroke pack — RACE scale (Rapid Arterial oCclusion Evaluation), total 0–9, ≥5 suggests LVO
| item id | label | levels |
|---|---|---|
| face | Facial palsy | 0 absent · 1 mild · 2 moderate–severe |
| arm | Arm motor | 0 normal/mild · 1 moderate (drifts, some effort vs gravity) · 2 severe (no effort vs gravity) |
| leg | Leg motor | 0 normal/mild · 1 moderate · 2 severe |
| gaze | Head & gaze deviation | 0 absent · 1 present |
| cortical | Aphasia (right-sided weakness) / Agnosia (left-sided weakness) | 0 normal · 1 one task failed · 2 both failed |

Extra Jev questions: `weak_side` choice {left,right,bilateral,none_reported}; one noul `mentioned_<item>` per item ("Does the report describe the examination of X, including a normal finding?"); nouls `flag_seizure`, `flag_head_trauma`, `flag_anticoagulant`.
Code-only extraction (regex): last known well ("40 minutes ago", "LKW 2 hours", "last seen normal at 14:10"), glucose ("BGL 42", "glucose 42") → hypoglycemia mimic flag if < 60.
Item status: `mentioned < 0.5` → **missing** (ask); else `confidence < 0.6` → **uncertain** (confirm); else **confident**.
Follow-up questions (pack data): face "Any facial droop — ask them to smile?", arm "Can they hold both arms up for 10 seconds?", leg "Can they lift each leg off the stretcher?", gaze "Are the eyes or head deviated to one side?", cortical "Can they follow two commands / recognise their weak arm?".

### MEDEVAC pack — 9-Line (casualty evacuation request; defensive/humanitarian framing)
Lines 1 (location grid) and 2 (radio freq/callsign) extracted by regex/code. Lines 3–9 are Jev choices:
- L3 precedence: A urgent · B urgent-surgical · C priority · D routine · E convenience
- L4 special equipment: A none · B hoist · C extraction equipment · D ventilator
- L5 patient type: L litter · A ambulatory · both
- L6 security at pickup: N no enemy · P possible enemy · E enemy, approach with caution · X armed escort required
- L7 marking: A panels · B pyrotechnic · C smoke · D none · E other
- L8 nationality/status: A US military · B US civilian · C non-US military · D non-US civilian · E EPW
- L9 NBC contamination: N none · C chemical · B biological · R radiological · NUC nuclear
Low-confidence lines become the **readback** list (follow_ups). No hospital routing; outcome is a MEDEVAC card.

### Demo scenarios (GET /api/scenarios)
1. `stroke_lvo` — clear LVO, all items described, LKW 40 min, ambulance near (7, 8) → RACE ~7 → Mercy (St. Luke's excluded: IR unavailable).
2. `stroke_missing_gaze` — same patient but gaze never mentioned → follow-up asked; answer "yes, eyes deviated to the right" completes it.
3. `stroke_minor` — mild facial droop only, RACE ~1 → nearest PSC (Riverside).
4. `stroke_mimic` — BGL 42, confused, weakness → hypoglycemia mimic flag shown prominently.
5. `medevac_urgent` — spoken 9-line with one ambiguous line (marking) → readback.
Transcripts should sound like real, slightly messy paramedic speech.

## Backend API (base `http://localhost:8000`)

All JSON uses snake_case. Pydantic models for every request/response.

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | /api/health | – | `Health` |
| GET | /api/protocols | – | `Protocol[]` |
| GET | /api/scenarios | – | `Scenario[]` |
| POST | /api/cases | `CreateCase` | `Case` |
| GET | /api/cases | – | `Case[]` (newest first) |
| GET | /api/cases/{id} | – | `Case` |
| POST | /api/cases/{id}/transcript | `{transcript: str, is_final: bool}` (full cumulative text, replaces) | `Case` (re-assessed) |
| POST | /api/cases/{id}/answers | `{item_id: str, text: str}` (appends `\n[Follow-up · <label>] <text>`) | `Case` |
| POST | /api/cases/{id}/route | – | `Case` (with routing) — 409 for packs without routing |
| POST | /api/cases/{id}/confirm | `{hospital_id?: str}` | `Case` (with alert) |
| GET | /api/hospitals | – | `HospitalStatus[]` |
| POST | /api/hospitals/refresh | – | `HospitalStatus[]` |
| GET | /api/events | – | SSE stream (see below) |
| POST | /api/photon/inbound | `InboundMessage` | `{ok: true, case_id}` |
| POST | /api/transcribe | multipart `audio` | `{text}` (501 if no STT configured) |
| GET | /portal | – | HTML: "Riverton Regional EMS Resource Board" (EMResource-style table) |
| POST | /portal/hospitals/{id} | form fields | redirect to /portal |

Assessment is debounced/coalesced server-side per case (if a new transcript arrives while a Jev call is in flight, run once more with the latest text when it finishes). Empty transcript → no Jev call.

### Types

```ts
type Mode = "live" | "simulated";
interface Health { status: "ok"; modes: { jev: Mode; gmi: Mode; browser: "browserbase" | "direct"; photon: Mode } }

interface ProtocolItem { id: string; label: string; kind: "score" | "choice"; levels: string[]; follow_up: string }
interface Protocol { id: "stroke_race" | "medevac_9line"; name: string; short: string; description: string; max_score: number | null; has_routing: boolean; items: ProtocolItem[] }
interface Scenario { id: string; protocol_id: string; title: string; subtitle: string; transcript: string; unit_position: { x: number; y: number } | null; follow_up_answers: Record<string, string> }

interface CreateCase { protocol_id: string; source: "console" | "photon"; unit_id?: string; unit_position?: { x: number; y: number } }

type ItemStatus = "confident" | "uncertain" | "missing";
interface ItemResult {
  id: string; label: string;
  value: number | null;           // score (0..n) for score items; index of chosen option for choice items
  value_label: string | null;     // human label of level/option
  probabilities: Record<string, number>; // level/option label -> p
  confidence: number;             // 0..1
  mentioned: number;              // 0..1 (noul)
  status: ItemStatus;
}
interface Flag { id: string; label: string; probability: number; active: boolean; source: "jev" | "code" }
interface FollowUp { item_id: string; question: string; reason: "missing" | "uncertain" }
interface JevCallStats { mode: Mode; model: string; latency_ms: number; questions: number; input_tokens: number; cost_usd: number }
interface Assessment {
  items: ItemResult[];
  total: number | null; max_total: number | null;
  interpretation: { label: string; severity: "low" | "moderate" | "high" };
  extracted: Record<string, string | number | null>; // e.g. lkw_minutes, glucose, weak_side, grid, callsign
  flags: Flag[];
  follow_ups: FollowUp[];
  jev: JevCallStats;
  computed_at: string;
}
type EdStatus = "open" | "advisory" | "diversion";
interface HospitalStatus { id: string; name: string; short_name: string; level: "CSC" | "TSC" | "PSC" | "ASRH"; x: number; y: number; ed_status: EdStatus; ct_available: boolean; neuro_ir_available: boolean; note: string; last_checked: string; source: "browserbase" | "direct" }
interface HospitalOption { hospital: HospitalStatus; eta_minutes: number; eligible: boolean; thrombectomy_capable: boolean; reasons: string[] }
interface Routing { recommended: HospitalOption; options: HospitalOption[]; lvo_suspected: boolean; rule_trace: string[]; decided_in_ms: number }
interface Message { id: string; thread: "medic" | "team"; author: string; role: "medic" | "firstminute" | "hospital"; text: string; kind: "text" | "alert" | "location"; at: string }
interface Alert { hospital_id: string; group_name: string; channel: Mode; sent_at: string; eta_minutes: number; sbar: { situation: string; background: string; assessment: string; recommendation: string }; sbar_source: Mode }
type CaseStatus = "listening" | "needs_info" | "ready" | "routed" | "alerted";
interface TimelineEvent { at: string; t_ms: number; kind: "jev" | "routing" | "browser" | "photon" | "llm" | "followup" | "medic"; label: string; detail: string | null; latency_ms: number | null }
interface Case {
  id: string; protocol_id: string; source: "console" | "photon"; created_at: string;
  unit_id: string; unit_position: { x: number; y: number } | null;
  transcript: string; status: CaseStatus;
  assessment: Assessment | null; routing: Routing | null; alert: Alert | null;
  messages: Message[]; timeline: TimelineEvent[];
}
interface InboundMessage { sender: string; text: string; chat_id?: string; attachment_url?: string; simulated?: boolean }
```

Status rules: no assessment → `listening`; follow_ups non-empty → `needs_info`; else `ready`; after /route → `routed`; after /confirm → `alerted`.

### SSE `/api/events`
`text/event-stream`, one JSON object per `data:` line: `{ "type": "case.updated", "case": Case }` | `{ "type": "hospitals.updated", "hospitals": HospitalStatus[] }`. Send a `: ping` comment every 15 s.

### Photon conversation flow (inbound, both live and simulated)
Medic texts FirstMinute → backend finds the sender's open case (or creates one; "9-line"/"medevac" keyword → MEDEVAC pack, else stroke) → appends text to transcript → assesses → replies in the **medic** thread:
- with follow-ups: one short line per follow-up ("Gaze not mentioned — are the eyes deviated?"); the medic's next message is treated as the answer to all open follow-ups.
- when ready (stroke): "RACE 7/9 · LVO suspected · LKW 40 min → Mercy General, ETA 12 min (St. Luke's: angio suite occupied). Reply CONFIRM to pre-alert." (routes automatically).
- "CONFIRM" → /confirm → creates the **team** thread "CODE STROKE · Unit M-14 · ETA 12" with the SBAR + location; replies "Pre-alert sent to Mercy stroke team."
Simulated mode: bridge absent → messages are only stored on the case (the console renders them in a phone mockup). The console's phone mockup posts to `/api/photon/inbound` with `simulated: true`.

### Messaging bridge (`messaging/`, port 8787)
- `POST /send` `{ to?: string, chat_id?: string, text: string }` → sends via Spectrum.
- `POST /group` `{ name: string, participants: string[], text: string }` → creates group chat and posts first message; returns `{ chat_id }`.
- Inbound Spectrum messages → `POST {BACKEND_URL}/api/photon/inbound`.
- `GET /health`.

## Design brief (app + landing + video share this language)

Inspiration: vansh-nagar/Pixel-Perfect (cloned at `/private/tmp/claude-501/-Users-vigneshr-Projects-jevathon/9b07aee2-bf01-4ff2-8871-416e681f62c4/scratchpad/pp` — read `src/app/globals.css`, `src/components/pixel-perfect`, `src/lib/dotmatrix-core.tsx`, `.claude/skills/*`).
Take from it: restraint, near-monochrome neutrals, hairline borders, precise spacing, Inter Tight, tactile "cool" buttons, dot-matrix motif, shimmer text for live states.

- **Type:** Inter Tight (UI, 400/500/600), JetBrains Mono (all numbers, latencies, scores, timestamps; tabular-nums).
- **Colour (tokens on :root, dark + light):** neutrals only for 95% of surfaces. One signal colour **Signal Red-Orange** `oklch(0.64 0.21 35)` reserved for stroke/LVO/alert. Status colours used sparingly as small dots/bars: confident `oklch(0.72 0.15 160)` (green-teal), uncertain `oklch(0.80 0.15 80)` (amber), missing = neutral dashed outline. Console defaults to dark (ops-room feel), landing defaults light; both themes supported.
- **Surfaces:** 1px hairline borders, radius 10–14px, subtle inner highlights, faint dot-grid backgrounds, very light grain. No big purple/blue gradients, no glassmorphism soup, no emoji, no stock "AI sparkle" icons, no lorem ipsum. Lucide icons at 16px, stroke 1.5.
- **Motion:** framer-motion (`motion/react`), springs (stiffness ~300, damping ~30), 150–350 ms. Numbers tick, bars fill, items settle. Respect `prefers-reduced-motion`.
- **Signature elements:** (1) a dot-matrix "Jev pulse" that flashes on each decision with the latency in ms; (2) RACE items as rows with segmented level bars + probability micro-histogram + status chip; (3) stylised Riverton map (SVG streets, river, hospitals as labelled nodes, ambulance marker, animated route line); (4) iPhone-style message thread mockups for the medic thread and the CODE STROKE team thread; (5) a timeline rail with `t+0.184s` stamps.
- **Copy voice:** calm, clinical, precise. Short sentences. Numbers over adjectives.

## Key facts for copy (verified, cite loosely)
- Untreated stroke: ~1.9M neurons lost per minute (Saver, Stroke 2006).
- Only ~67% of EMS-transported stroke patients get hospital pre-notification (GWTG-Stroke, 2003–2011).
- Guided stroke triage apps take ~2 minutes of tapping (JoinTriage, vendor figure).
- Radio contact sometimes only in the final ~5 minutes of transport (NPSTC report).
- Direct routing to thrombectomy centre: thrombectomy 119 min earlier vs transfer (Maryland pilot).
- Jev: ~100–400 ms median per decision in independent benchmarks; 5–10× faster than frontier LLMs on classification.
- Stroke ≈ 2% of EMS dispatches → medics are rusty on scales.
- Existing tools: Pulsara (one-tap alerts), JoinTriage (guided form + routing), Viz.ai (in-hospital CT AI). FirstMinute = the voice-first, confidence-aware, live-status routing layer on top.
