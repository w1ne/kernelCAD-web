#!/usr/bin/env bash
set -euo pipefail

bundle_dir="$(cd "$(dirname "$0")" && pwd)"
cd "$bundle_dir"

for phase in before after; do
  if [[ "$phase" == "before" ]]; then
    headline='BEFORE: pallet deck uses the corrugatedBoard control'
    footer='Local source preview. The deck remains a simplified slab; no deployment or load acceptance is implied.'
  else
    headline='AFTER: pallet deck uses the palletTimber control'
    footer='Local source preview. Same 132-triangle geometry and envelope; no deployment or load acceptance is implied.'
  fi

  convert -size 1280x720 xc:'#edf2f7' \
    -font DejaVu-Sans -fill '#203040' -pointsize 29 -annotate +48+48 'KERNELCAD / CASE LAYER PALLETIZER' \
    -pointsize 22 -annotate +48+84 "$headline" \
    \( "$phase.png" -resize 512x512 \) -geometry +48+112 -composite \
    -pointsize 20 -annotate +690+133 'Outfeed pallet deck' \
    \( "detail-$phase.png" -resize 450x300 \) -geometry +690+152 -composite \
    -font DejaVu-Sans -pointsize 17 -fill '#34495e' -annotate +48+690 "$footer" \
    "$phase-card.png"

  ffmpeg -y -loop 1 -framerate 24 -i "$phase-card.png" \
    -vf 'format=yuv420p' -t 4 -c:v libx264 -preset veryfast -crf 27 -r 24 \
    "$phase.mp4" >/dev/null 2>&1
done

ffmpeg -y -i before.mp4 -i after.mp4 \
  -filter_complex '[0:v][1:v]concat=n=2:v=1:a=0,format=yuv420p[v]' \
  -map '[v]' -c:v libx264 -preset veryfast -crf 27 -r 24 -movflags +faststart \
  -metadata title='Case layer palletizer pallet material review' \
  -metadata comment='Local preview comparison; no deployment or equipment acceptance claimed.' \
  demo.mp4
