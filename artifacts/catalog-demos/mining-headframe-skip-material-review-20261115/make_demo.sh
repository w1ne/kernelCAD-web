#!/usr/bin/env bash
# Build the before/after review MP4 from the checked-in evidence images.
set -euo pipefail
D="$(cd "$(dirname "$0")" && pwd)"
pad='scale=1024:1024:force_original_aspect_ratio=decrease,pad=1024:1024:(ow-iw)/2:(oh-ih)/2:color=0xeef2f6,setsar=1'
lbl() { echo "drawtext=text='$1':x=24:y=980:fontsize=30:fontcolor=0x1f2937:box=1:boxcolor=0xffffffcc:boxborderw=8"; }
args=(); filters=""; i=0
for pair in \
  "previews/before/shaft-headframe.png|BEFORE default preview - ore skip in winder-house cladding" \
  "previews/before/skip-crop.png|BEFORE crop - cream skip in the tower" \
  "previews/before/inspect-focus-iso.png|BEFORE focus - skip same cladding as the cage" \
  "previews/before/inspect-front.png|BEFORE inspect front - skip matches the winder house" \
  "previews/after/inspect-front.png|AFTER inspect front - skip in headframe steel" \
  "previews/after/skip-crop.png|AFTER crop - steel skip, bail unchanged" \
  "previews/after/shaft-headframe.png|AFTER default preview - geometry unchanged"; do
  f="${pair%%|*}"; t="${pair#*|}"
  args+=(-loop 1 -t 3.5 -i "$D/$f")
  filters+="[$i:v]$pad,$(lbl "$t"),format=yuv420p[v$i];"
  i=$((i+1))
done
concat=""; for n in $(seq 0 $((i-1))); do concat+="[v$n]"; done
ffmpeg -y -loglevel error "${args[@]}" -filter_complex "${filters}${concat}concat=n=$i:v=1:a=0[out]" -map "[out]" -r 25 -c:v libx264 -pix_fmt yuv420p "$D/shaft-headframe-skip-material-review.mp4"
exit 0
