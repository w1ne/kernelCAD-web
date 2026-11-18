#!/usr/bin/env bash
set -euo pipefail

bundle_dir="$(cd "$(dirname "$0")" && pwd)"
cd "$bundle_dir"

for phase in before after; do
  if [[ "$phase" == "before" ]]; then
    headline='BEFORE: level box with no grit-extraction screw'
    footer='Local source preview. Existing source describes a sloped trough; no deployment or process performance is implied.'
  else
    headline='AFTER: inclined helical screw lifts grit to the outlet'
    footer='Local source preview. CC0 illustrative geometry only; not vendor dimensions or treatment-performance proof.'
  fi

  convert "previews/$phase.png" -crop 250x210+240+45 +repage \
    -resize 450x300^ -gravity center -extent 450x300 "detail-$phase.png"
  convert -size 1280x720 xc:'#edf2f7' \
    -font DejaVu-Sans -fill '#203040' -pointsize 29 -annotate +48+48 'KERNELCAD / GRIT CLASSIFIER' \
    -pointsize 22 -annotate +48+84 "$headline" \
    \( "previews/$phase.png" -resize 512x512 \) -geometry +48+112 -composite \
    -pointsize 20 -annotate +690+133 'Classifier screw and outlet detail' \
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
  -metadata title='Grit classifier semantic review' \
  -metadata comment='Local preview comparison; no deployment or treatment-performance acceptance claimed.' \
  demo.mp4
