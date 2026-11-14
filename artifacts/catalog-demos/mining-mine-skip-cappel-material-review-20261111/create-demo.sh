#!/usr/bin/env bash
set -euo pipefail

bundle_dir="$(cd "$(dirname "$0")" && pwd)"
cd "$bundle_dir"

for phase in before after; do
  if [[ "$phase" == "before" ]]; then
    headline='BEFORE: the cappel uses the warning-yellow palette'
    footer='Before: cappel is grouped with the warning stripe, guide rollers and landing keps.'
  else
    headline='AFTER: the cappel uses the structuralSteel control'
    footer='After: steel fitting separated from safety markings; 1,490 tris and envelope unchanged.'
  fi

  convert -size 1280x720 xc:'#edf2f7' \
    -font DejaVu-Sans -fill '#203040' -pointsize 34 -annotate +48+52 'MINING / MINE SKIP' \
    -pointsize 23 -annotate +48+91 "$headline" \
    \( "$phase.png" -resize 512x512 \) -geometry +48+122 -composite \
    -pointsize 21 -annotate +700+144 'Cappel / head rope connection' \
    \( "detail-$phase.png" -resize 330x350 \) -geometry +700+158 -composite \
    -pointsize 20 -annotate +48+684 "$footer" \
    "$phase-card.png"

  ffmpeg -y -loop 1 -framerate 24 -i "$phase-card.png" \
    -vf 'format=yuv420p' -t 4 -c:v libx264 -preset veryfast -crf 27 -r 24 \
    "$phase.mp4" >/dev/null 2>&1
done

ffmpeg -y -i before.mp4 -i after.mp4 \
  -filter_complex '[0:v][1:v]concat=n=2:v=1:a=0,format=yuv420p[v]' \
  -map '[v]' -c:v libx264 -preset veryfast -crf 27 -r 24 -movflags +faststart \
  -metadata title='Mine skip cappel material review' \
  -metadata comment='Local preview comparison; no deployment or equipment acceptance claimed.' \
  demo.mp4
