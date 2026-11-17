#!/usr/bin/env bash
# Build a short before/after review from committed catalog and verification images.
set -euo pipefail
D="$(cd "$(dirname "$0")" && pwd)"
pad='scale=1180:650:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:10:color=0xeef2f6,setsar=1'
lbl() { echo "drawtext=text='$1':x=24:y=680:fontsize=28:fontcolor=0x1f2937:box=1:boxcolor=0xffffffcc:boxborderw=8"; }
args=(); filters=""; i=0
for pair in \
  "preview-review-five-assets.png|FIVE PREVIEWS - mining equipment selection" \
  "previews/before/grizzly-scalping-deck.png|BEFORE - coil springs share warning yellow" \
  "previews/before/springs-crop.png|BEFORE DETAIL - spring coils appear safety yellow" \
  "previews/after/grizzly-scalping-deck.png|AFTER - spring coils use support steel" \
  "previews/after/springs-crop.png|AFTER DETAIL - vibrator weight covers remain yellow" \
  "verification-card.png|GLB REGRESSION - 20 coils steel gray; warning covers yellow" \
  "previews/after/grizzly-scalping-deck.png|LOCAL RESULT - 2746 triangles / 3200 budget" \
  "previews/after/grizzly-scalping-deck.png|Software preview only - not deployed or physically accepted"; do
  f="${pair%%|*}"; t="${pair#*|}"
  args+=(-loop 1 -t 2.5 -i "$D/$f")
  filters+="[$i:v]$pad,$(lbl "$t"),format=yuv420p[v$i];"
  i=$((i+1))
done
concat=""; for n in $(seq 0 $((i-1))); do concat+="[v$n]"; done
ffmpeg -y -loglevel error "${args[@]}" -filter_complex "${filters}${concat}concat=n=$i:v=1:a=0[out]" -map "[out]" -r 25 -c:v libx264 -crf 22 -pix_fmt yuv420p "$D/mining-grizzly-spring-material-review.mp4"
