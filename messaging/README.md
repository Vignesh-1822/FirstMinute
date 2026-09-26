# FirstMinute messaging bridge (Photon Spectrum)

Bridges Photon's Spectrum framework (iMessage / SMS / WhatsApp) to the
FastAPI backend. Port **8787**. See `docs/SPEC.md` — "Messaging bridge" and
"Photon conversation flow" — for the contract this implements.

## What you need

- **Node 22** — `source ~/.nvm/nvm.sh && nvm use 22` (system default is 18).
- A **Photon Cloud project** (free at https://app.photon.codes) for
  `SPECTRUM_PROJECT_ID` / `SPECTRUM_PROJECT_SECRET`. These authenticate the
  `Spectrum()` client itself.
- For iMessage specifically, the *simplest* path is to use the Photon
  Cloud-hosted iMessage number for your project — nothing else to run,
  just the project credentials above. If you'd rather drive your **own**
  Mac + phone number, pair the self-hosted relay
  (`@photon-ai/advanced-imessage`, github.com/photon-hq/advanced-imessage-ts)
  and set `PHOTON_IMESSAGE_ADDRESS` / `PHOTON_IMESSAGE_TOKEN` /
  `PHOTON_IMESSAGE_PHONE`.
- No Photon account at all? The server still runs — see "Simulated / no
  credentials" below.

Copy `.env.example` to `.env` and fill in what you have.

## Run

```bash
source ~/.nvm/nvm.sh && nvm use 22
cd messaging
npm install
npm run dev        # tsx watch src/index.ts
# or
npm run build && npm start
```

## Endpoints

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/health` | – | `{ ok, connected, channel }` |
| POST | `/send` | `{ to?, chat_id?, text }` | one of `to`/`chat_id` required |
| POST | `/group` | `{ name, participants[], text }` | creates a group chat (iMessage), posts `text`, returns `{ chat_id }`; falls back to individual sends (`{ chat_id: null, fallback: "individual" }`) on channels/errors where group creation is unsupported |

Every inbound message the Photon agent receives is forwarded as
`POST ${BACKEND_URL}/api/photon/inbound` with
`{ sender, text, chat_id, attachment_url? }`, retried with exponential
backoff (`PHOTON_INBOUND_RETRIES` / `PHOTON_INBOUND_RETRY_BASE_MS`).
Non-text inbound content (attachments, reactions, membership events) is
currently skipped rather than forwarded — see "Known gaps" below.

## Test with curl

```bash
curl -s localhost:8787/health | jq
# {"ok":true,"connected":false,"channel":"imessage"}   <- no credentials

curl -s -X POST localhost:8787/send \
  -H 'content-type: application/json' \
  -d '{"to":"+15551234567","text":"hello"}' | jq
# 503 when disconnected: {"ok":false,"error":"Photon bridge is not connected — ..."}

curl -s -X POST localhost:8787/group \
  -H 'content-type: application/json' \
  -d '{"name":"CODE STROKE · Unit M-14 · ETA 12","participants":["+15551111111","+15552222222"],"text":"Pre-alert: incoming stroke, ETA 12 min"}' | jq
```

## How STROKE_TEAM_HANDLES maps to this bridge

The backend's `STROKE_TEAM_HANDLES` (comma-separated phone numbers/emails,
see `backend/.env.example`) is the `participants` array this bridge's
`/group` endpoint receives — one handle per stroke-team phone (attending,
resident, charge nurse, etc). The paramedic's own phone is never in that
list: they talk to FirstMinute one-on-one (the "medic" thread, driven by
inbound messages + `/send` with `to: <paramedic handle>` or the `chat_id`
that inbound message arrived on). When the medic replies `CONFIRM`, the
backend calls this bridge's `/group` once to open the separate "team"
thread — `CODE STROKE · Unit <unit_id> · ETA <n>` — addressed to
`STROKE_TEAM_HANDLES`, seeded with the SBAR handoff as the first message.
The two threads (medic 1:1, team group) are intentionally different Photon
spaces with different `chat_id`s.

## SDK research notes

`spectrum-ts@12.10.1` is a real, published npm package (installed here —
see `messaging/node_modules/spectrum-ts`) that re-exports
`@spectrum-ts/core` plus per-channel provider packages
(`@spectrum-ts/imessage`, `@spectrum-ts/whatsapp-business`, `@spectrum-ts/slack`,
`@spectrum-ts/telegram`, `@spectrum-ts/terminal`). The iMessage provider
depends on `@photon-ai/advanced-imessage`, i.e. the same library behind
github.com/photon-hq/advanced-imessage-ts.

Every method used in `src/photon.ts` was verified two ways: (1) against
`photon.codes/docs` (README, spectrum-ts/{introduction,getting-started,
messages,spaces-and-users,content,providers/imessage/*}) and the
`Peoplerepabulic/settle` example app's `src/index.ts` / `src/agent.ts`
(confirmed the `SPECTRUM_PROJECT_ID`/`SPECTRUM_PROJECT_SECRET` env-var
convention and the `Spectrum({projectId, projectSecret, providers})` →
`for await (const [space, message] of app.messages)` shape); and (2)
directly against the installed package's own `.d.ts` files, which is the
authoritative source used for exact signatures:

| Symbol | Verified in |
|---|---|
| `Spectrum({projectId, projectSecret, providers})` → `SpectrumInstance` | `node_modules/@spectrum-ts/core/dist/app-*.d.ts` (`declare function Spectrum<...>`) |
| `SpectrumInstance.messages: AsyncIterable<[Space, Message]>`, `.stop()`, `.send(space, content)` | same file, `type SpectrumInstance = ...` |
| `imessage.config({ clients? })` — `clients: {address, token, phone}` optional (omit ⇒ Photon Cloud-hosted number) | `node_modules/@spectrum-ts/imessage/dist/index.d.ts` (`declare const definedIMessage: Platform<PlatformDef<"imessage", ZodObject<{clients: ...}>, ...>>`) |
| `imessage(app)` platform narrowing → `{ space: { create, get }, user }` | `Platform<Def>` callable signature + `PlatformInstance<Def>`, same file tree, `@spectrum-ts/core` |
| `platform.space.create(participants: string \| string[])` (1:1 or group) | `SpaceNamespace<Def>.create`, `@spectrum-ts/core/dist/app-*.d.ts`; group example also in `photon.codes/docs/spectrum-ts/spaces-and-users` |
| `platform.space.get(chatId)` | same `SpaceNamespace<Def>` |
| `space.rename(displayName)` (group-only; throws `UnsupportedError` on DMs / `@spectrum-ts/imessage-local`) | `Space.rename` in core `.d.ts`, and `photon.codes/docs/spectrum-ts/providers/imessage/messaging-features/chat-renaming` |
| `space.send(text)` — plain string accepted (`ContentInput = string \| ContentBuilder`) | core `.d.ts` |
| `message.content.type` discriminated union (`"text" \| "markdown" \| "attachment" \| ...`), `message.direction`, `message.sender?.id` / `.kind` | core `.d.ts` `Message`/`Content` types; narrowing pattern also matches `settle`'s `agent.ts` (`messageText()`, `direction === "outbound"`, `sender?.kind === "agent"`) |
| `whatsappBusiness.config({accessToken, phoneNumberId, appSecret?})` | `node_modules/@spectrum-ts/whatsapp-business/dist/index.d.ts` |
| `UnsupportedError` (thrown for unsupported group creation) | `node_modules/@spectrum-ts/core/dist/app-*.d.ts` |

**Not independently verified** (no Photon credentials were available in
this environment, so nothing above was exercised against a real Photon
Cloud project or a live iMessage/WhatsApp account):
- That a live `Spectrum({projectId, projectSecret, providers:[imessage.config()]})`
  call actually succeeds end-to-end against Photon Cloud, and that the
  Cloud-hosted (no `clients`) iMessage mode behaves as the type signature
  implies.
- Real inbound message shapes/timing from an actual iMessage or WhatsApp
  conversation (only the `.d.ts` contracts and the `settle` example's
  handling of them were checked, not a live payload).
- WhatsApp Business's actual behavior when `space.create` is called with
  multiple participants — I assumed (and coded around) it not supporting
  group creation at all, based on its space schema only exposing `{id}`
  (no group/dm distinction, unlike iMessage's schema), so `/group` on
  `PHOTON_CHANNEL=whatsapp` always takes the individual-send fallback
  rather than attempting `space.create(participants[])` and catching a
  runtime `UnsupportedError`.

## Simulated / no credentials

If `SPECTRUM_PROJECT_ID`/`SPECTRUM_PROJECT_SECRET` (or, for
`PHOTON_CHANNEL=whatsapp`, the WhatsApp creds) are missing, or the initial
`Spectrum()` connection attempt throws, the server **still starts**:
- `GET /health` → `{ ok: true, connected: false, channel: "<configured>" }`
- `POST /send` / `POST /group` → `503` with a clear
  `{ ok: false, error: "Photon bridge is not connected — ..." }` body.

The FastAPI backend treats a bridge-absent/503 state as "simulated
messaging" per `docs/SPEC.md` and renders the phone-mockup UI instead.

## Known gaps / follow-ups

- Attachments: inbound `attachment` content is currently skipped (not
  forwarded) rather than uploaded somewhere and passed as
  `attachment_url` — there's no object storage wired up in this hackathon
  scope. `InboundMessage.attachment_url` stays `undefined` for now.
- Only iMessage and WhatsApp Business are wired into `src/photon.ts`
  (Slack/Telegram/terminal providers are installed as transitive deps of
  `spectrum-ts` but not used) — trivial to add following the same pattern
  in `connectBridge()`.
- Reconnection: if the inbound stream ends or throws after a successful
  connect, `/health` flips to `connected:false` and stays there (no
  automatic reconnect loop) — acceptable for a hackathon demo, worth
  revisiting for anything longer-running.
