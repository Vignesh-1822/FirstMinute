# FirstMinute — frontend

React 19 + Vite + TypeScript + Tailwind v4 + shadcn/ui + TanStack Query + motion.

## Run

```bash
source ~/.nvm/nvm.sh && nvm use 22   # Node 22 required
npm install
npm run dev          # http://localhost:5173  (/ landing, /console product)
npm run build        # tsc -b && vite build
npm run lint         # oxlint
```

## Environment (`.env`, see `.env.example`)

| Var | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | FastAPI backend base URL (SSE at `/api/events`, portal at `/portal`) |
| `VITE_USE_MOCKS` | `false` | `true` = in-browser simulated backend, no server needed |

The backend's CORS allows `http://localhost:5173` — open the app on `localhost`, not `127.0.0.1`.

## Mock mode

`VITE_USE_MOCKS=true npm run dev` swaps `src/services/httpApi.ts` for `src/services/mocks/mockApi.ts`:
keyword-based scoring with 90–220 ms simulated Jev latency, the SPEC routing policy, template SBAR,
Photon inbound flow and an event bus standing in for SSE. Everything reports `simulated`. In mock
mode the IR tag in the hospital list is clickable to demo a live reroute without the portal.

## Structure

```
src/
  components/atoms       pure UI (DotMatrix, LevelBar, MicroHistogram, StatusChip, ModeBadge…)
  components/molecules   composed UI, local state only (ItemRow, FollowUpPrompt, PhoneFrame…)
  components/organisms   hook-aware sections (ScoringPanel, RoutingPanel, RivertonMap, landing sections…)
  components/ui          shadcn/ui (Button extended with tactile variants)
  templates              ConsoleTemplate (3 columns + rail), LandingTemplate
  pages                  LandingPage, ConsolePage, NotFoundPage
  services               all backend calls (httpApi, mocks/), typed against src/types/api.ts
  hooks                  React Query hooks, useEventStream (SSE → cache), useConsoleSession,
                         useScenarioPlayer, useSpeechRecognition, useJevMeter, useTheme
  types                  SPEC types verbatim (api.ts) + UI/service types
  lib                    formatting, Riverton geometry, transcript highlight cues
```

Console flow: scenario playback streams ~3.2 words/s → cumulative transcript posted (throttled 250 ms,
`is_final` at end) → items fill live → follow-ups answered via `/answers` → auto `/route` when final with
no follow-ups → confirm → CODE STROKE thread. SSE `case.updated` / `hospitals.updated` write straight
into the React Query cache; if hospital capability changes while a case is `routed`, the console re-requests `/route`.
