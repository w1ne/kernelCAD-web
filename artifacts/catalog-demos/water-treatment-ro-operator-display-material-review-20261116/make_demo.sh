#!/usr/bin/env bash
# Build a short before/after review from committed catalog and verification images.
set -euo pipefail
D="$(cd "$(dirname "$0")" && pwd)"
pad='scale=1180:650:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:10:color=0xeef2f6,setsar=1'
lbl() { echo "drawtext=text='$1':x=24:y=680:fontsize=28:fontcolor=0x1f2937:box=1:boxcolor=0xffffffcc:boxborderw=8"; }
args=(); filters=""; i=0
for pair in \
  "preview-review-five-assets.png|FIVE PREVIEWS - water, shipyard and data-center equipment" \
  "previews/before/reverse-osmosis-skid.png|BEFORE - RO skid operator display uses structural steel" \
  "previews/before/cabinet-crop.png|BEFORE DETAIL - display renders as a grey steel plate" \
  "previews/after/reverse-osmosis-skid.png|AFTER - display uses operator display glass" \
  "previews/after/cabinet-crop.png|AFTER DETAIL - dark screen on the stainless door" \
  "verification-card.png|GLB REGRESSION - operator-display 1f2d36 and door stainless" \
  "previews/after/reverse-osmosis-skid.png|LOCAL RESULT - 2660 triangles / 3300 budget" \
  "previews/after/reverse-osmosis-skid.png|Software preview only - not deployed or physically accepted"; do
  f="${pair%%|*}"; t="${pair#*|}"
  args+=(-loop 1 -t 2.5 -i "$D/$f")
  filters+="[$i:v]$pad,$(lbl "$t"),format=yuv420p[v$i];"
  i=$((i+1))
done
concat=""; for n in $(seq 0 $((i-1))); do concat+="[v$n]"; done
ffmpeg -y -loglevel error "${args[@]}" -filter_complex "${filters}${concat}concat=n=$i:v=1:a=0[out]" -map "[out]" -r 25 -c:v libx264 -crf 22 -pix_fmt yuv420p "$D/water-treatment-ro-operator-display-material-review.mp4"
