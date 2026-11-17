#!/usr/bin/env bash
# Build the before/after review MP4 from the checked-in evidence images.
set -euo pipefail
D="$(cd "$(dirname "$0")" && pwd)"
pad='scale=1024:1024:force_original_aspect_ratio=decrease,pad=1024:1024:(ow-iw)/2:(oh-ih)/2:color=0xeef2f6,setsar=1'
lbl() { echo "drawtext=text='$1':x=24:y=980:fontsize=30:fontcolor=0x1f2937:box=1:boxcolor=0xffffffcc:boxborderw=8"; }
args=(); filters=""; i=0
for pair in \
  "previews/before/solar-carport-canopy.png|BEFORE default preview - charger cable in galvanized steel" \
  "previews/before/charger-crop.png|BEFORE 8x crop - grey metal-bar loop" \
  "previews/before/inspect-charger-iso.png|BEFORE inspect iso - charger parts only" \
  "previews/after/inspect-charger-iso.png|AFTER inspect iso - black cable jacket" \
  "previews/after/charger-crop.png|AFTER 8x crop - dark cable loop" \
  "previews/after/solar-carport-canopy.png|AFTER default preview - geometry unchanged"; do
  f="${pair%%|*}"; t="${pair#*|}"
  args+=(-loop 1 -t 3.5 -i "$D/$f")
  filters+="[$i:v]$pad,$(lbl "$t"),format=yuv420p[v$i];"
  i=$((i+1))
done
concat=""; for n in $(seq 0 $((i-1))); do concat+="[v$n]"; done
ffmpeg -y -loglevel error "${args[@]}" -filter_complex "${filters}${concat}concat=n=$i:v=1:a=0[out]" -map "[out]" -r 25 -c:v libx264 -pix_fmt yuv420p "$D/charger-cable-review.mp4"
