#!/usr/bin/env bash
# Build a short before/after review from committed catalog and verification images.
set -euo pipefail
D="$(cd "$(dirname "$0")" && pwd)"
pad='scale=1180:650:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:10:color=0xeef2f6,setsar=1'
lbl() { echo "drawtext=text='$1':x=24:y=680:fontsize=28:fontcolor=0x1f2937:box=1:boxcolor=0xffffffcc:boxborderw=8"; }
args=(); filters=""; i=0
for pair in \
  "preview-review-five-assets.png|FIVE PREVIEWS - data-center equipment selection" \
  "previews/before/condenser-pump-skid.png|BEFORE - steel base frame uses engineering polymer" \
  "previews/before/base-crop.png|BEFORE DETAIL - base skid renders yellow polymer" \
  "previews/after/condenser-pump-skid.png|AFTER - base skid uses skid base steel" \
  "previews/after/base-crop.png|AFTER DETAIL - pumps and headers keep painted steel" \
  "verification-card.png|GLB REGRESSION - base-skid 3d4449 and no polymer knob" \
  "previews/after/condenser-pump-skid.png|LOCAL RESULT - 300 triangles / 2200 budget" \
  "previews/after/condenser-pump-skid.png|Software preview only - not deployed or physically accepted"; do
  f="${pair%%|*}"; t="${pair#*|}"
  args+=(-loop 1 -t 2.5 -i "$D/$f")
  filters+="[$i:v]$pad,$(lbl "$t"),format=yuv420p[v$i];"
  i=$((i+1))
done
concat=""; for n in $(seq 0 $((i-1))); do concat+="[v$n]"; done
ffmpeg -y -loglevel error "${args[@]}" -filter_complex "${filters}${concat}concat=n=$i:v=1:a=0[out]" -map "[out]" -r 25 -c:v libx264 -crf 22 -pix_fmt yuv420p "$D/data-center-condenser-pump-skid-base-material-review.mp4"
