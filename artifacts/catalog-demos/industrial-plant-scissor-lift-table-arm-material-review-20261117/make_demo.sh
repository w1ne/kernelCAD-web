#!/usr/bin/env bash
set -euo pipefail

D="$(cd "$(dirname "$0")" && pwd)"
python3 "$D/make_review_assets.py"

ffmpeg -y -hide_banner -loglevel error \
  -loop 1 -t 2.8 -i "$D/video-review/slide-01.png" \
  -loop 1 -t 2.8 -i "$D/video-review/slide-02.png" \
  -loop 1 -t 2.8 -i "$D/video-review/slide-03.png" \
  -loop 1 -t 2.8 -i "$D/video-review/slide-04.png" \
  -loop 1 -t 2.8 -i "$D/video-review/slide-05.png" \
  -filter_complex "[0:v][1:v][2:v][3:v][4:v]concat=n=5:v=1:a=0[out]" \
  -map '[out]' -r 25 -c:v libx264 -crf 22 -pix_fmt yuv420p \
  "$D/industrial-plant-scissor-lift-table-arm-material-review.mp4"
