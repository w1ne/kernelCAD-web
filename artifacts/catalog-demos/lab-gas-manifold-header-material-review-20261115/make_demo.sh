#!/usr/bin/env bash
# Build the before/after review MP4 from the checked-in evidence images.
set -euo pipefail
D="$(cd "$(dirname "$0")" && pwd)"
pad='scale=1024:1024:force_original_aspect_ratio=decrease,pad=1024:1024:(ow-iw)/2:(oh-ih)/2:color=0xeef2f6,setsar=1'
lbl() { echo "drawtext=text='$1':x=24:y=980:fontsize=30:fontcolor=0x1f2937:box=1:boxcolor=0xffffffcc:boxborderw=8"; }
args=(); filters=""; i=0
for pair in \
  "previews/before/lab-gas-manifold-panel.png|BEFORE default preview - gas header in panel enamel" \
  "previews/before/header-crop.png|BEFORE crop - header reads as a plate ledge" \
  "previews/before/inspect-front.png|BEFORE inspect front - header invisible on the plate" \
  "previews/after/inspect-front.png|AFTER inspect front - stainless header under the risers" \
  "previews/after/header-crop.png|AFTER crop - header matches the stainless risers" \
  "previews/after/lab-gas-manifold-panel.png|AFTER default preview - geometry unchanged"; do
  f="${pair%%|*}"; t="${pair#*|}"
  args+=(-loop 1 -t 3.5 -i "$D/$f")
  filters+="[$i:v]$pad,$(lbl "$t"),format=yuv420p[v$i];"
  i=$((i+1))
done
concat=""; for n in $(seq 0 $((i-1))); do concat+="[v$n]"; done
ffmpeg -y -loglevel error "${args[@]}" -filter_complex "${filters}${concat}concat=n=$i:v=1:a=0[out]" -map "[out]" -r 25 -c:v libx264 -pix_fmt yuv420p "$D/lab-gas-manifold-header-material-review.mp4"
