#!/usr/bin/env python3
"""
Compose the FirstMinute score procedurally (original, synthesised, no samples).

Reads the cut from src/timeline.json so the music lines up with the film:
  problem (cold open -> today)  : dark A-minor pads + a slow heartbeat pulse, tension at the end
  reveal                        : soft riser, bell, lift to C major
  how it works                  : brighter pads Am-F-C-G, sub bass, gentle plucked arpeggio with echo
  speed -> built with           : same bed, arpeggio thins out
  close                         : resolve to C (add9), long fade

Writes public/music.wav (44.1 kHz stereo, peak -3 dBFS). scripts/build-music.sh then loudness-normalises
it to about -18 LUFS and encodes public/music.mp3.
Usage: python3 scripts/compose-music.py
"""
import json
import math
import pathlib
import wave

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent.parent
SR = 44100
FPS = 30
RNG = np.random.default_rng(7)

# ---------------------------------------------------------------- timeline
timeline = json.loads((ROOT / "src" / "timeline.json").read_text())
trans = timeline["transitionFrames"]
how_steps = timeline["howSteps"]
scenes = dict(timeline["scenes"])
scenes["how"] = sum(how_steps.values()) - (len(how_steps) - 1) * trans
starts = {}
cursor = 0
for key in timeline["order"]:
    starts[key] = cursor / FPS
    cursor += scenes[key] - trans
TOTAL = (cursor + trans) / FPS
N = int(round(TOTAL * SR))
t_all = np.arange(N) / SR

REVEAL = starts["reveal"]
HOW = starts["how"]
SPEED = starts["speed"]
BEYOND = starts["beyond"]
CLOSE = starts["close"]

# ---------------------------------------------------------------- harmony
NOTE = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}


def hz(name: str) -> float:
    pitch, octave = name[:-1], int(name[-1])
    midi = 12 * (octave + 1) + NOTE[pitch]
    return 440.0 * 2 ** ((midi - 69) / 12)


VOICINGS = {
    "Am": ["A2", "E3", "A3", "C4", "E4"],
    "F": ["F2", "C3", "A3", "C4", "E4"],       # Fmaj7 colour
    "C": ["C3", "G3", "C4", "E4", "G4"],
    "G": ["G2", "D3", "G3", "B3", "D4"],
    "Dm": ["D3", "A3", "D4", "F4", "A4"],
    "Esus": ["E2", "B2", "E3", "A3", "B3"],
    "E": ["E2", "B2", "E3", "G#3", "B3"],
    "Cadd9": ["C3", "G3", "C4", "D4", "E4", "G4"],
}
ARP_NOTES = {
    "Am": ["A4", "C5", "E5", "A5"],
    "F": ["F4", "A4", "C5", "E5"],
    "C": ["C5", "E5", "G5", "C6"],
    "G": ["G4", "B4", "D5", "G5"],
}

# (start, end, chord, brightness 0..1)
chords = []
chords.append((0.0, starts["todayForm"], "Am", 0.15))
chords.append((starts["todayForm"], starts["todayGap"], "F", 0.2))
mid_gap = (starts["todayGap"] + REVEAL) / 2
chords.append((starts["todayGap"], mid_gap, "Dm", 0.22))
chords.append((mid_gap, mid_gap + (REVEAL - mid_gap) * 0.55, "Esus", 0.28))
chords.append((mid_gap + (REVEAL - mid_gap) * 0.55, REVEAL, "E", 0.32))
chords.append((REVEAL, HOW, "C", 0.55))
how_len = SPEED - HOW
cycle = ["Am", "F", "C", "G"]
bars = 8
for i in range(bars):
    a = HOW + how_len * i / bars
    b = HOW + how_len * (i + 1) / bars
    chords.append((a, b, cycle[i % 4], 0.6))
tail = [("F", SPEED, starts["impact"]), ("C", starts["impact"], starts["safety"]),
        ("G", starts["safety"], BEYOND), ("Am", BEYOND, starts["builtWith"]),
        ("F", starts["builtWith"], CLOSE)]
for name, a, b in tail:
    chords.append((a, b, name, 0.5))
chords.append((CLOSE, TOTAL, "Cadd9", 0.45))


def segment_env(a: float, b: float, attack: float, release: float) -> tuple[int, int, np.ndarray]:
    """Envelope for a chord held a..b with a soft attack and a release that overlaps the next chord."""
    i0 = max(0, int((a - attack * 0.5) * SR))
    i1 = min(N, int((b + release) * SR))
    t = np.arange(i0, i1) / SR
    rise = np.clip((t - (a - attack * 0.5)) / attack, 0, 1)
    fall = np.clip(1 - (t - b) / release, 0, 1)
    env = (0.5 - 0.5 * np.cos(np.pi * rise)) * (0.5 - 0.5 * np.cos(np.pi * fall))
    return i0, i1, env


def soft_saw(freq: float, t: np.ndarray, brightness: float, phase: float) -> np.ndarray:
    """Band-limited, rounded saw: few harmonics, steep roll-off when dark."""
    out = np.zeros_like(t)
    rolloff = 2.2 - 1.0 * brightness
    harmonics = 3 + int(brightness * 6)
    for n in range(1, harmonics + 1):
        if freq * n > 7000:
            break
        out += np.sin(2 * np.pi * freq * n * t + phase * n) / n ** rolloff
    return out


left = np.zeros(N)
right = np.zeros(N)

# ---------------------------------------------------------------- pads
for a, b, name, bright in chords:
    i0, i1, env = segment_env(a, b, attack=1.6, release=1.8)
    t = np.arange(i0, i1) / SR
    lfo = 1 + 0.06 * np.sin(2 * np.pi * 0.13 * t + a)
    for k, note in enumerate(VOICINGS[name]):
        f = hz(note)
        weight = 0.9 if k == 0 else 0.55
        for cents, pan in ((-6, 0.2), (0, 0.5), (6, 0.8)):
            fd = f * 2 ** (cents / 1200)
            ph = RNG.uniform(0, 2 * np.pi)
            voice = soft_saw(fd, t, bright, ph) * env * lfo * weight / 3
            left[i0:i1] += voice * math.cos(pan * math.pi / 2)
            right[i0:i1] += voice * math.sin(pan * math.pi / 2)

# ---------------------------------------------------------------- sub bass (how-it-works onward)
for a, b, name, bright in chords:
    if a < REVEAL:
        continue
    i0, i1, env = segment_env(a, b, attack=0.8, release=1.0)
    t = np.arange(i0, i1) / SR
    f = hz(VOICINGS[name][0])
    while f > 70:
        f /= 2
    sub = np.sin(2 * np.pi * f * t) * env * 0.35
    left[i0:i1] += sub
    right[i0:i1] += sub

# ---------------------------------------------------------------- heartbeat (problem section)
beat_period = 60 / 62


def thump(at: float, gain: float) -> None:
    i0 = int(at * SR)
    length = int(0.35 * SR)
    if i0 + length >= N:
        return
    t = np.arange(length) / SR
    freq = 42 + 34 * np.exp(-t / 0.05)
    phase = 2 * np.pi * np.cumsum(freq) / SR
    body = np.sin(phase) * np.exp(-t / 0.11) * (1 - np.exp(-t / 0.004))
    left[i0:i0 + length] += body * gain
    right[i0:i0 + length] += body * gain


beat = 1.2
while beat < REVEAL - 0.6:
    fade_in = min(1.0, beat / 3.0)
    fade_out = min(1.0, max(0.0, (REVEAL - 0.6 - beat) / 2.5))
    g = 0.9 * fade_in * fade_out
    thump(beat, g)
    thump(beat + 0.27, g * 0.55)
    beat += beat_period

# ---------------------------------------------------------------- riser into the reveal
r0, r1 = REVEAL - 3.2, REVEAL + 0.25
i0, i1 = int(r0 * SR), int(r1 * SR)
noise = RNG.standard_normal(i1 - i0)
spec = np.fft.rfft(noise)
freqs = np.fft.rfftfreq(len(noise), 1 / SR)
spec *= 1 / (1 + (freqs / 1800) ** 2)          # soft low-pass: breathy, not hissy
noise = np.fft.irfft(spec, len(noise))
noise /= np.max(np.abs(noise))
t = np.arange(i1 - i0) / SR
ramp = (t / (r1 - r0)) ** 2.2 * np.clip((r1 - r0 - t) / 0.25, 0, 1)
riser = noise * ramp * 0.12
left[i0:i1] += riser
right[i0:i1] += np.roll(riser, 220)


# ---------------------------------------------------------------- bells
def bell(at: float, note: str, gain: float, decay: float = 3.5) -> None:
    i0 = int(at * SR)
    length = min(int(decay * 2 * SR), N - i0)
    t = np.arange(length) / SR
    f = hz(note)
    tone = np.zeros(length)
    for ratio, amp, dec in ((1.0, 1.0, decay), (2.0, 0.35, decay * 0.6), (2.76, 0.18, decay * 0.35), (5.4, 0.06, decay * 0.2)):
        tone += amp * np.sin(2 * np.pi * f * ratio * t) * np.exp(-t / dec)
    tone *= 1 - np.exp(-t / 0.003)
    left[i0:i0 + length] += tone * gain * 0.8
    right[i0:i0 + length] += tone * gain


bell(REVEAL + 0.2, "E5", 0.16)
bell(REVEAL + 0.2, "C5", 0.10)
bell(CLOSE + 0.15, "G5", 0.10)
bell(CLOSE + 0.15, "C5", 0.12, 5.0)

# ---------------------------------------------------------------- plucked arpeggio with ping-pong echo
arp_l = np.zeros(N)
arp_r = np.zeros(N)
step = how_len / bars / 8  # eight notes per chord bar
pattern = [0, 1, 2, 3, 2, 1, 2, 3]


def pluck(at: float, note: str, gain: float) -> None:
    i0 = int(at * SR)
    length = min(int(1.2 * SR), N - i0)
    if length <= 0:
        return
    t = np.arange(length) / SR
    f = hz(note)
    tone = (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.08))
    tone *= np.exp(-t / 0.35) * (1 - np.exp(-t / 0.004))
    arp_l[i0:i0 + length] += tone * gain
    arp_r[i0:i0 + length] += tone * gain


for a, b, name, bright in chords:
    if name not in ARP_NOTES or a < HOW - 0.01 or a >= CLOSE:
        continue
    notes = ARP_NOTES[name]
    thin = a >= SPEED  # after how-it-works: half the notes, quieter
    k = 0
    at = a
    while at < b - 1e-6:
        if not thin or k % 2 == 0:
            accent = 1.0 if k % 4 == 0 else 0.7
            pluck(at, notes[pattern[k % 8]], 0.075 * accent * (0.7 if thin else 1.0))
        k += 1
        at += step

delay = int(step * 1.5 * SR)
echo_l = np.zeros(N)
echo_r = np.zeros(N)
for tap in range(1, 5):
    g = 0.42 ** tap
    shift = delay * tap
    src = arp_r if tap % 2 else arp_l
    dst = echo_l if tap % 2 else echo_r
    dst[shift:] += src[: N - shift] * g
left += arp_l * 0.8 + echo_l + arp_r * 0.2
right += arp_r * 0.8 + echo_r + arp_l * 0.2

# ---------------------------------------------------------------- reverb (FFT convolution) + gentle tone shaping
ir_len = int(3.2 * SR)
t_ir = np.arange(ir_len) / SR
size = 1 << int(math.ceil(math.log2(N + ir_len)))
freqs = np.fft.rfftfreq(size, 1 / SR)
tone_curve = 1 / np.sqrt(1 + (freqs / 8500) ** 4)       # roll off harsh highs
tone_curve *= 1 / np.sqrt(1 + (28 / np.maximum(freqs, 1)) ** 4)  # clear sub-rumble

wet = []
for channel, seed in ((left, 11), (right, 12)):
    ir_noise = np.random.default_rng(seed).standard_normal(ir_len)
    ir = ir_noise * np.exp(-t_ir / 0.9)
    ir_spec = np.fft.rfft(ir, size)
    ir_spec *= 1 / (1 + (freqs / 4500) ** 2)             # darker tail
    ir /= np.sqrt(np.sum(ir ** 2))
    dry_spec = np.fft.rfft(channel, size)
    wet_sig = np.fft.irfft(dry_spec * ir_spec, size)[:N]
    wet_sig /= np.max(np.abs(wet_sig)) + 1e-9
    wet_sig *= np.max(np.abs(channel)) * 0.9
    mixed = channel * 0.72 + wet_sig * 0.45
    mixed = np.fft.irfft(np.fft.rfft(mixed, size) * tone_curve, size)[:N]
    wet.append(mixed)
left, right = wet

# ---------------------------------------------------------------- master fades + normalise
fade_in = np.clip(t_all / 2.0, 0, 1) ** 2
fade_out = np.clip((TOTAL - t_all) / 5.0, 0, 1) ** 1.5
master = fade_in * fade_out
left *= master
right *= master
peak = max(np.max(np.abs(left)), np.max(np.abs(right)))
scale = 10 ** (-3 / 20) / peak
stereo = np.stack([left * scale, right * scale], axis=1)
pcm = (np.clip(stereo, -1, 1) * 32767).astype("<i2")

out = ROOT / "public" / "music.wav"
out.parent.mkdir(exist_ok=True)
with wave.open(str(out), "wb") as wav:
    wav.setnchannels(2)
    wav.setsampwidth(2)
    wav.setframerate(SR)
    wav.writeframes(pcm.tobytes())
print(f"wrote {out} · {TOTAL:.3f}s · {N} samples")
for key in timeline["order"]:
    print(f"  {key:10s} {starts[key]:6.2f}s")
