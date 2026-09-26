# FirstMinute — pitch film (Remotion)

A 2-minute product film for judges and non-clinical audiences: the problem, what FirstMinute does, how it
works (five steps), why it differs from existing tools, the impact, and what it is built on.
It uses the same visual language as the app: near-black neutrals, hairline borders, Inter Tight + JetBrains
Mono, one signal colour (Signal Red-Orange `oklch(0.64 0.21 35)` ≈ `#f0491c`), teal for confident, amber
for uncertain, a dot-grid stage and the dot-matrix "Jev pulse". Every UI mockup is a real React component,
not a screenshot.

- 1920×1080, 30 fps, **3630 frames ≈ 121 s**, H.264
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

## Adding music or a voiceover

The film renders silent. Its pacing was set for a calm music bed and an optional narrator.

1. Put the files in `video/public/`, e.g. `public/music.mp3` and `public/voiceover.mp3` (use audio you have a licence for).
2. Pass them as props. You do not need to change any code:

```bash
npx remotion render FirstMinutePitch out/firstminute-pitch.mp4 \
  --props='{"musicSrc":"music.mp3","voiceoverSrc":"voiceover.mp3"}'
```

`src/Pitch.tsx` then mounts `<Audio src={staticFile(musicSrc)} />`. The music fades in over 2 s and out
over the last 3 s. When a voiceover is present, the music is ducked to 0.35. In Studio, set the same props
in the right-hand props panel. To change the fades, edit `musicVolume()` in `src/Pitch.tsx`.

## Scene list

Neighbouring scenes cross-fade for 20 frames (0.67 s). Times are where each scene starts in the final film.

| # | Scene | Start | Length | What the viewer should take away |
|---|---|---|---|---|
| 1 | Cold open | 0:00.0 | 7.0 s | A counter ticks to 1,900,000: "brain cells lost every minute a stroke goes untreated." (Saver 2006) |
| 2 | The moment | 0:06.3 | 10.0 s | A paramedic has minutes to decide three things: major stroke? which hospital? team ready? |
| 3 | Today: form + radio | 0:15.7 | 10.5 s | A guided checklist takes about 2 min of tapping. Radio contact often comes only in the last 5 min |
| 4 | Today: the gap | 0:25.5 | 10.0 s | 1 in 3 stroke patients arrive without a pre-alert. "Tools like Pulsara and JoinTriage put the form on a phone. The form is still the bottleneck." |
| 5 | Reveal | 0:34.8 | 7.0 s | FirstMinute: "The first minute decides the stroke. We make it count." |
| 6a | How 01 · Talk | 0:41.2 | 8.5 s | The medic just talks. A live transcript types out and the key findings get highlighted |
| 6b | How 02 · Score | 0:49.0 | 9.5 s | Jev scores the five RACE items with confidence, pulses at 142 ms. Total 7/9 · LVO suspected |
| 6c | How 03 · Ask | 0:57.8 | 9.5 s | Gaze was never mentioned, so it asks one question. The medic answers and the row turns confident |
| 6d | How 04 · Route | 1:06.7 | 10.0 s | Riverton map with live status via Browserbase + Stagehand. St. Luke's angio suite is occupied, so the route redraws to Mercy General (ETA 12 min) |
| 6e | How 05 · Alert | 1:16.0 | 9.0 s | The medic confirms, GMI Cloud writes the SBAR, and Photon opens the CODE STROKE group chat with a location card |
| 7 | Speed | 1:24.3 | 7.5 s | Today it takes 2–5 min; FirstMinute takes seconds. Each Jev decision takes ~100–400 ms |
| 8 | Impact | 1:31.2 | 6.5 s | Clot removal comes 119 min sooner when the first hospital is the right one (Maryland pilot) |
| 9 | Safety | 1:37.0 | 7.0 s | Jev scores. Code decides. The medic confirms. |
| 10 | Beyond stroke | 1:43.3 | 7.0 s | Protocol packs: Stroke (RACE), 9-Line MEDEVAC (both built), STEMI and Trauma (next) |
| 11 | Built with | 1:49.7 | 5.5 s | Jev by TypeSafe · Photon · Browserbase · Stagehand · GMI Cloud · CodeRabbit (text wordmarks only) |
| 12 | Close | 1:54.5 | 6.5 s | "Every minute is 1.9 million neurons. Give them back." Fades to black |

Durations live in `src/timeline.ts`. The in-scene beats are frame constants at the top of each scene file.

## Structure

```
src/
├── index.ts, Root.tsx        compositions
├── Pitch.tsx                 scene order, cross-fades, optional audio
├── Poster.tsx                poster composition
├── theme.ts                  colour tokens, fonts, easing (bezier 0.16, 1, 0.3, 1)
├── timeline.ts               scene durations
├── lib/anim.ts               progress / fade / breathe helpers
├── components/               Backdrop (stage), Motion (FadeUp, Headline…), DotMatrix (Jev pulse),
│                             Race (rows + card), Phone (iPhone + bubbles), StepLayout, Wordmark
└── scenes/                   Opening, Today, Brand, HowTalk, HowScore (+Ask), HowRoute, HowAlert,
                              HowItWorks, Closing
```

All data is synthetic, and Riverton and its hospitals are fictional. The stats come from `docs/SPEC.md`,
"Key facts for copy".
