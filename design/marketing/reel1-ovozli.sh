#!/usr/bin/env bash
# "UyService nima?" Reels — o'zbekcha ovoz + effektlar + fon musiqasi bilan.
# Kerak: python (espeakng-loader, numpy, scipy), node + playwright (PW), ffmpeg.
#   PW=<yo'l>/node_modules/playwright QR_MOD=<yo'l>/node_modules/qrcode bash design/marketing/reel1-ovozli.sh
set -euo pipefail
D="$(cd "$(dirname "$0")" && pwd)"
T="$(mktemp -d)"
PY="${PYTHON:-python3}"
"$PY" "$D/tts_voice.py" "$T"                     # 1) hikoya: har sahna uchun WAV + uzunliklar
VOICE_JSON="$T/voice.json" EVENTS_OUT="$T/events.json" VIDEO_OUT="$T/silent.mp4" node "$D/reels.js"   # 2) video (vaqtlar ovozga moslashadi)
"$PY" "$D/audio.py" "$T/events.json" "$T" "$T/mix.wav"   # 3) ovoz + effektlar + musiqa
ffmpeg -v error -y -i "$T/silent.mp4" -i "$T/mix.wav" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart \
  "$D/instagram/reel-1-uyservice-nima-ovozli.mp4"
rm -rf "$T"
echo "✓ instagram/reel-1-uyservice-nima-ovozli.mp4"
