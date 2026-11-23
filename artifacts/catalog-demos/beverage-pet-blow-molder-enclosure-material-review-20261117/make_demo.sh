#!/usr/bin/env bash
set -euo pipefail

D="$(cd "$(dirname "$0")" && pwd)"
pad='scale=1180:650:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:10:color=0xeef2f7,setsar=1'
caption() { printf "drawtext=text='%s':x=24:y=680:fontsize=24:fontcolor=0x223040:box=1:boxcolor=0xffffffff:boxborderw=8" "$1"; }

args=()
filters=""
i=0
for pair in \
  "samples/pet-blow-molder.png|AUDIT 1 of 5 - PET stretch blow molder" \
  "samples/rotary-filler.png|AUDIT 2 of 5 - rotary bottle filler" \
  "samples/case-layer-palletizer.png|AUDIT 3 of 5 - case layer palletizer" \
  "samples/bottle-rinser-carousel.png|AUDIT 4 of 5 - bottle rinser carousel" \
  "samples/case-erector.png|AUDIT 5 of 5 - corrugated case erector" \
  "previews/before/pet-blow-molder.png|BEFORE - stainless finish covers the outer machine enclosure" \
  "previews/after/pet-blow-molder.png|AFTER - light enclosure coating is separately controlled" \
  "previews/after/pet-blow-molder.png|RESULT - 3 material controls, 2 presets, 364 tris of 2200" \
  "previews/after/pet-blow-molder.png|LOCAL SOFTWARE PREVIEW AND GLB TEST ONLY - not simulation, deployment, or hardware acceptance"; do
  file="${pair%%|*}"
  label="${pair#*|}"
  args+=(-loop 1 -t 2.4 -i "$D/$file")
  filters+="[$i:v]$pad,$(caption "$label"),format=yuv420p[v$i];"
  i=$((i+1))
done

concat=""
for n in $(seq 0 $((i - 1))); do concat+="[v$n]"; done
ffmpeg -y -loglevel error "${args[@]}" \
  -filter_complex "${filters}${concat}concat=n=$i:v=1:a=0[out]" \
  -map '[out]' -r 25 -c:v libx264 -crf 23 -pix_fmt yuv420p -movflags +faststart \
  "$D/beverage-pet-blow-molder-enclosure-material-review.mp4"
