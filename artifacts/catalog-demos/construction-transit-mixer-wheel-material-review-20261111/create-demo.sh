#!/usr/bin/env bash
set -euo pipefail

bundle_dir="$(cd "$(dirname "$0")" && pwd)"
cd "$bundle_dir"
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'

convert -size 1280x720 xc:'#edf2f7' \
  -fill '#203848' -draw 'rectangle 0,0 1280,82' \
  -font "$font" -pointsize 27 -fill white -annotate +32+52 'CONSTRUCTION EQUIPMENT / FIVE PREVIEWS CHECKED' \
  \( sample/backhoe-loader.png -resize 220x220 \) -geometry +24+145 -composite \
  \( sample/crawler-dozer.png -resize 220x220 \) -geometry +274+145 -composite \
  \( sample/motor-grader.png -resize 220x220 \) -geometry +524+145 -composite \
  \( sample/skid-steer-loader.png -resize 220x220 \) -geometry +774+145 -composite \
  \( sample/transit-mixer-truck.png -resize 220x220 \) -geometry +1024+145 -composite \
  -font "$font" -pointsize 16 -fill '#203848' \
  -annotate +44+393 'Backhoe loader' \
  -annotate +283+393 'Crawler dozer' \
  -annotate +535+393 'Motor grader' \
  -annotate +781+393 'Skid-steer loader' \
  -annotate +1028+393 'Transit mixer' \
  -fill '#203848' -draw 'rectangle 0,624 1280,720' \
  -font "$font" -pointsize 19 -fill white -annotate +32+657 'One material mismatch found: six steel rims used equipment enamel.' \
  -pointsize 15 -annotate +32+690 'Local software-rendered catalog previews | no simulation, deployment or vehicle acceptance' \
  sample-card.png

for phase in before after; do
  if [[ "$phase" == before ]]; then
    heading='BEFORE: six rims use equipmentPaintColor'
    detail='The steel rims share the yellow finish used by the cab and drum bands.'
  else
    heading='AFTER: six rims use structuralSteelColor'
    detail='Gray rims separate from yellow equipment paint; tires stay black.'
  fi

  convert -size 1280x720 xc:'#edf2f7' \
    -fill '#203848' -draw 'rectangle 0,0 1280,82' \
    -font "$font" -pointsize 28 -fill white -annotate +34+53 'TRANSIT MIXER TRUCK / WHEEL MATERIAL' \
    \( "previews/$phase.png" -resize 500x500 \) -geometry +32+100 -composite \
    \( "previews/$phase.png" -crop 430x150+35+265 +repage -resize 610x213! \) -geometry +630+173 -composite \
    -font "$font" -pointsize 22 -fill '#203848' -annotate +630+132 "$heading" \
    -pointsize 18 -annotate +630+430 "$detail" \
    -pointsize 18 -annotate +630+477 '6 named wheel-rim parts; 4,296 triangles unchanged.' \
    -fill '#203848' -draw 'rectangle 0,624 1280,720' \
    -font "$font" -pointsize 16 -fill white -annotate +32+657 'Local catalog software render | branch not deployed' \
    -pointsize 15 -annotate +32+690 'No equipment simulation, roadworthiness or physical acceptance claimed.' \
    "$phase-card.png"
done

ffmpeg -hide_banner -y -loop 1 -framerate 24 -i sample-card.png -t 3 \
  -vf 'format=yuv420p' -c:v libx264 -preset fast -crf 24 -r 24 sample.mp4
ffmpeg -hide_banner -y -loop 1 -framerate 24 -i before-card.png -t 4 \
  -vf 'format=yuv420p' -c:v libx264 -preset fast -crf 24 -r 24 before.mp4
ffmpeg -hide_banner -y -loop 1 -framerate 24 -i after-card.png -t 5 \
  -vf 'format=yuv420p' -c:v libx264 -preset fast -crf 24 -r 24 after.mp4
ffmpeg -hide_banner -y -i sample.mp4 -i before.mp4 -i after.mp4 \
  -filter_complex '[0:v][1:v][2:v]concat=n=3:v=1:a=0,format=yuv420p[v]' \
  -map '[v]' -c:v libx264 -preset fast -crf 24 -r 24 -movflags +faststart \
  -metadata title='Transit mixer wheel material review' \
  -metadata comment='Local catalog preview comparison; no simulation, deployment or vehicle acceptance claimed.' \
  demo.mp4
