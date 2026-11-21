#!/usr/bin/env bash
set -euo pipefail

D="$(cd "$(dirname "$0")" && pwd)"
pad='scale=1180:650:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:10:color=0xeef2f7,setsar=1'
caption() { echo "drawtext=text='$1':x=24:y=680:fontsize=25:fontcolor=0x223040:box=1:boxcolor=0xffffffff:boxborderw=8"; }

args=()
filters=""
i=0
for pair in \
  "preview-review-five-assets.png|FIVE RENDERED INDUSTRIAL ASSETS - one material mismatch selected" \
  "before/plc-control-rack.png|BEFORE - status indicator blocks use safety paint" \
  "after/plc-control-rack.png|AFTER - steel cards, green channel RUN, red ERROR lenses" \
  "verification-card.png|EXPORTED GLB REGRESSION - 21 status lenses checked; 1/1 passed" \
  "after/plc-control-rack.png|LOCAL SOFTWARE PREVIEW ONLY - no simulation or hardware acceptance"; do
  file="${pair%%|*}"
  label="${pair#*|}"
  args+=(-loop 1 -t 2.8 -i "$D/$file")
  filters+="[$i:v]$pad,$(caption "$label"),format=yuv420p[v$i];"
  i=$((i + 1))
done

concat=""
for n in $(seq 0 $((i - 1))); do concat+="[v$n]"; done
ffmpeg -y -loglevel error "${args[@]}" \
  -filter_complex "${filters}${concat}concat=n=$i:v=1:a=0[out]" \
  -map '[out]' -r 25 -c:v libx264 -crf 22 -pix_fmt yuv420p \
  "$D/industrial-plant-plc-control-rack-status-led-material-review.mp4"
