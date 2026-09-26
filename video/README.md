# FirstMinute — pitch film (Remotion)

An 88-second product film for judges and non-clinical audiences: the problem, what FirstMinute does, how it
works (five steps), why it differs from existing tools, the impact, and what it is built on.
It uses the same visual language as the app: near-black neutrals, hairline borders, Inter Tight + JetBrains
Mono, one signal colour (Signal Red-Orange `oklch(0.64 0.21 35)` ≈ `#f0491c`), teal for confident, amber
for uncertain, a dot-grid stage and the dot-matrix "Jev pulse". Every UI mockup is a real React component,
not a screenshot.

- 1920×1080, 30 fps, **2640 frames = 88 s**, H.264 + AAC (original procedural score, about −18 LUFS)
- Output: `out/firstminute-pitch.mp4`, poster: `out/poster.png`

All commands use Node 22:

```bash
source ~/.nvm/nvm.sh && nvm use 22
npm install
```

## Preview

```bash
npx remotion studio          # or: npm run studio
```

Compositions: `FirstMinutePitch` (the film) and `FirstMinutePoster` (animated poster; its last frame is the still).

## Render

```bash
npx remotion render FirstMinutePitch out/firstminute-pitch.mp4      # npm run render
npx remotion still FirstMinutePoster out/poster.png --frame=179      # npm run poster
node scripts/render-stills.mjs [frame ...]                           # review stills → out/frames/
npx tsc --noEmit                                                     # typecheck
```

Encoding settings (h264, CRF 16, yuv420p) live in `remotion.config.ts`. The first render downloads
Chrome Headless Shell (~90 MB).

## Music (original, procedural) and voiceover

The score is composed in code. It uses no samples, downloads or licensed audio.
`scripts/compose-music.py` (Python and numpy) reads the cut from `src/timeline.json`, so the music follows the
film:

- **Problem section:** dark A-minor pads and a slow heartbeat pulse, building tension (Dm → Esus → E).
- **Reveal:** a soft riser and a bell, then a lift to C major.
- **How it works:** brighter pads (Am–F–C–G, one chord per 4 s), a sub bass and a plucked arpeggio with a ping-pong echo.
- **Close:** the arpeggio thins out, the harmony resolves to Cadd9 and the music fades out.

`scripts/build-music.sh` runs the script, applies two-pass loudnorm (−18 LUFS, −1.5 dBTP) and writes
`public/music.mp3`. **If you change any timing in `src/timeline.json`, re-run it:**

```bash
./scripts/build-music.sh      # needs python3 + numpy + ffmpeg (libmp3lame)
```

The composition's default props already include `musicSrc: "music.mp3"`, so a plain render has sound.
To swap the track or add a voiceover, put the files in `public/` and pass them as props:

```bash
npx remotion render FirstMinutePitch out/firstminute-pitch.mp4 \
  --props='{"musicSrc":"my-track.mp3","voiceoverSrc":"voiceover.mp3"}'
```

When a voiceover is present, the music is ducked to 0.35 (`musicVolume()` in `src/Pitch.tsx`). Pass
`"musicSrc": null` to render silent.

## Scene list

Neighbouring scenes cross-fade for 15 frames (0.5 s). Times are where each scene starts in the final film.

| # | Scene | Start | Length | What the viewer should take away |
|---|---|---|---|---|
| 1 | Cold open | 0:00.0 | 5.0 s | A counter ticks to 1,900,000: "brain cells lost every minute a stroke goes untreated." (Saver 2006) |
| 2 | The moment | 0:04.5 | 6.5 s | A paramedic has minutes to decide three things: major stroke? which hospital? team ready? |
| 3 | Today: form + radio | 0:10.5 | 7.8 s | A guided checklist takes about 2 min of tapping. Radio contact often comes only in the last 5 min |
| 4 | Today: the gap | 0:17.8 | 8.0 s | 1 in 3 stroke patients arrive without a pre-alert. "Tools like Pulsara and JoinTriage put the form on a phone. The form is still the bottleneck." |
| 5 | Reveal | 0:25.3 | 5.0 s | FirstMinute: "The first minute decides the stroke. We make it count." |
| 6a | How 01 · Talk | 0:29.8 | 6.2 s | The medic just talks. A live transcript types out and the key findings get highlighted |
| 6b | How 02 · Score | 0:35.5 | 7.0 s | Jev scores the five RACE items with confidence, pulses at 142 ms. Total 7/9 · LVO suspected |
| 6c | How 03 · Ask | 0:42.0 | 7.2 s | Gaze was never mentioned, so it asks one question. The medic answers and the row turns confident |
| 6d | How 04 · Route | 0:48.7 | 7.5 s | Live status via Browserbase + Stagehand. St. Luke's angio suite is occupied, so the route goes to Mercy (ETA 12 min) |
| 6e | How 05 · Alert | 0:55.7 | 6.5 s | The medic confirms, GMI Cloud writes the SBAR, and Photon opens the CODE STROKE group chat |
| 7 | Speed | 1:01.7 | 5.0 s | Today it takes 2–5 min; FirstMinute takes seconds. Each Jev decision takes ~100–400 ms |
| 8 | Impact | 1:06.2 | 5.0 s | Clot removal comes 119 min sooner when the first hospital is the right one (Maryland pilot) |
| 9 | Safety | 1:10.7 | 5.0 s | Jev scores. Code decides. The medic confirms. |
| 10 | Beyond stroke | 1:15.2 | 4.8 s | Protocol packs: Stroke, 9-Line MEDEVAC (both built), STEMI and Trauma (next) |
| 11 | Built with | 1:19.5 | 4.0 s | Jev by TypeSafe · Photon · Browserbase · Stagehand · GMI Cloud · CodeRabbit |
| 12 | Close | 1:23.0 | 5.0 s | "Every minute is 1.9 million neurons. Give them back." Fades to black |

Durations live in `src/timeline.json` and are shared with the music script. The in-scene beats are frame constants at the top of each scene file.

## Structure

```
src/
├── index.ts, Root.tsx        compositions
├── Pitch.tsx                 scene order, cross-fades, optional audio
├── Poster.tsx                poster composition
├── theme.ts                  colour tokens, fonts, easing (bezier 0.16, 1, 0.3, 1)
├── timeline.json/.ts         scene durations (shared with scripts/compose-music.py)
├── lib/anim.ts               progress / fade / breathe helpers
├── components/               Backdrop (stage), Motion (FadeUp, Headline…), DotMatrix (Jev pulse),
│                             Race (rows + card), Phone (iPhone + bubbles), StepLayout, Wordmark
└── scenes/                   Opening, Today, Brand, HowTalk, HowScore (+Ask), HowRoute, HowAlert,
                              HowItWorks, Closing
```

All data is synthetic, and Riverton and its hospitals are fictional. The stats come from `docs/SPEC.md`,
"Key facts for copy".
