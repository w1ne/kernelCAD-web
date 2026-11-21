#!/usr/bin/env bash
set -euo pipefail

D="$(cd "$(dirname "$0")" && pwd)"
pad='scale=1180:650:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:10:color=0xeef2f7,setsar=1'
caption() { echo "drawtext=text='$1':x=24:y=680:fontsize=25:fontcolor=0x223040:box=1:boxcolor=0xffffffff:boxborderw=8"; }

args=()
filters=""
i=0
for pair in \
  "preview-review-five-assets.png|FIVE RENDERED ASSETS - one material mismatch selected" \
  "previews/before/palletizer-robot-cell.png|BEFORE - floor slab inherits safetyPaint" \
  "previews/after/palletizer-robot-cell.png|AFTER - floor slab uses its concrete control" \
  "previews/after/edited-concrete.png|PARAM EDIT - concrete changed to #777a75; safety paint stays separate" \
  "verification-card.png|LOCAL SOFTWARE PREVIEW + GLB REGRESSION ONLY - no deployment or hardware acceptance"; do
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
  "$D/palletizer-robot-cell-floor-material-review.mp4"
