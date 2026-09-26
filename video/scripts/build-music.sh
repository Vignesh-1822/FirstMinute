#!/usr/bin/env bash
# Compose the original score and normalise it to ~-18 LUFS (two-pass loudnorm), then encode MP3.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 scripts/compose-music.py
FFMPEG="${FFMPEG:-ffmpeg}"
measured=$("$FFMPEG" -hide_banner -i public/music.wav -af loudnorm=I=-18:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
get() { echo "$measured" | grep "\"$1\"" | sed -E 's/.*: "([^"]+)".*/\1/'; }
"$FFMPEG" -hide_banner -loglevel error -y -i public/music.wav \
  -af "loudnorm=I=-18:TP=-1.5:LRA=11:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true" \
  -ar 44100 -ac 2 -c:a libmp3lame -b:a 192k public/music.mp3
rm public/music.wav
echo "wrote public/music.mp3"
