#!/usr/bin/env bash
# Build the before/after review MP4 from the checked-in evidence images.
set -euo pipefail
D="$(cd "$(dirname "$0")" && pwd)"
pad='scale=1024:1024:force_original_aspect_ratio=decrease,pad=1024:1024:(ow-iw)/2:(oh-ih)/2:color=0xeef2f6,setsar=1'
lbl() { echo "drawtext=text='$1':x=24:y=980:fontsize=30:fontcolor=0x1f2937:box=1:boxcolor=0xffffffcc:boxborderw=8"; }
args=(); filters=""; i=0
for pair in \
  "previews/before/cold-aisle-roof-panel.png|BEFORE default preview - 1 of 5 roof panels is polymer" \
  "previews/before/roof-crop.png|BEFORE crop - panels 1-4 painted like the steel frame" \
  "previews/before/inspect-iso.png|BEFORE inspect iso - one amber panel, four steel" \
  "previews/after/inspect-iso.png|AFTER inspect iso - all five panels polymer" \
  "previews/after/roof-crop.png|AFTER crop - steel frame, polymer infill" \
  "previews/after/cold-aisle-roof-panel.png|AFTER default preview - 8774 px changed, geometry unchanged"; do
  f="${pair%%|*}"; t="${pair#*|}"
  args+=(-loop 1 -t 3.5 -i "$D/$f")
  filters+="[$i:v]$pad,$(lbl "$t"),format=yuv420p[v$i];"
  i=$((i+1))
done
concat=""; for n in $(seq 0 $((i-1))); do concat+="[v$n]"; done
ffmpeg -y -loglevel error "${args[@]}" -filter_complex "${filters}${concat}concat=n=$i:v=1:a=0[out]" -map "[out]" -r 25 -c:v libx264 -pix_fmt yuv420p "$D/data-center-cold-aisle-roof-panel-material-review.mp4"
