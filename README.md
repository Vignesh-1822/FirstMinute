# FirstMinute

**The first minute decides the stroke. We make it count.**

A paramedic describes the patient in plain speech. FirstMinute scores the RACE stroke scale item by item with
**Jev** (TypeSafe System One), asks back only what it is unsure about, checks live hospital status with
**Browserbase + Stagehand**, and after the medic confirms opens a **CODE STROKE** iMessage group with the stroke
team via **Photon**, with an SBAR handoff written on **GMI Cloud**.

> Pulsara and JoinTriage put the paper stroke form on a phone. FirstMinute removes the form.

Jev scores. Code decides. The medic confirms. Synthetic data only; decision support, not a medical device.

## Run it

Requires Node 22 (`nvm use 22`) and Python 3.10+.

```bash
# 1. Backend (FastAPI) — :8000
cd backend && python3 -m venv venv && ./venv/bin/pip install -r requirements.txt
cp .env.example .env            # add TYPESAFE_API_KEY, GMI_*, BROWSERBASE_* when you have them
./venv/bin/uvicorn main:app --port 8000

# 2. Photon bridge (iMessage) — :8787
cd messaging && npm install && cp .env.example .env   # SPECTRUM_PROJECT_ID / SPECTRUM_PROJECT_SECRET
npm run build && npm start

# 3. Frontend — :5173
cd frontend && npm install && npm run dev
```

Open http://localhost:5173 (landing) and http://localhost:5173/console (product).
The regional hospital status board lives at http://localhost:8000/portal.

Every integration runs **live** when its key is set and **simulated** otherwise. The console shows which mode each one is in.

## Demo script (3 minutes)

1. **Landing** (20 s): the problem in numbers.
2. **Console → Play "Clear LVO"**: the transcript streams in, RACE rows fill live, each Jev decision shows its latency, and the total reads 7/9 · LVO suspected.
3. **Play "Missing gaze"**: the gaze row goes dashed and FirstMinute asks "Are the eyes deviated?". Answer it and the row turns confident.
4. **Routing**: St. Luke's is excluded because its angio suite is occupied (read from the status board), so the route goes to Mercy General. Open `/portal`, flip Mercy's Neuro IR off, and watch the route change.
5. **Confirm & pre-alert**: the CODE STROKE group chat appears with the SBAR. With Photon live, it lands on the stroke team's real phones.
6. **Real phone**: text the project's iMessage number as the medic. The same flow runs over iMessage, and the console mirrors it.

## Repo

| Path | What |
|---|---|
| `backend/` | FastAPI: Jev, routing rules, hospital status scraper + mock portal, GMI SBAR, Photon flow, SSE |
| `frontend/` | React + Vite + TS + Tailwind + shadcn: landing page and live console |
| `messaging/` | Photon Spectrum bridge (iMessage) |
| `video/` | Remotion pitch film → `video/out/firstminute-pitch.mp4` |
| `docs/SPEC.md` | Product + API contract + design brief |

## Why Jev

Jev returns typed answers with calibrated probabilities in about 100–400 ms. Clinical scales are typed forms, so each RACE item maps
onto a Jev score question. All items plus "was this mentioned?" checks go in one parallel request. Low confidence triggers a
follow-up question instead of a guess. Date math, glucose thresholds and routing stay in deterministic code, where they belong.
