#!/usr/bin/env bash
set -euo pipefail

bundle=artifacts/catalog-demos/airfield-pushback-tug-cradle-material-review-20261113
python3 "$bundle/capture_review.py"
ffmpeg -hide_banner -y \
  -loop 1 -framerate 24 -t 4 -i "$bundle/slides/01-five-preview-audit.png" \
  -loop 1 -framerate 24 -t 3 -i "$bundle/slides/02-source-material.png" \
  -loop 1 -framerate 24 -t 3 -i "$bundle/slides/03-before.png" \
  -loop 1 -framerate 24 -t 4 -i "$bundle/slides/04-after.png" \
  -loop 1 -framerate 24 -t 4 -i "$bundle/slides/05-verification.png" \
  -filter_complex "[0:v][1:v][2:v][3:v][4:v]concat=n=5:v=1:a=0,format=yuv420p[v]" \
  -map "[v]" -r 24 -an -c:v libx264 -preset medium -crf 22 \
  -movflags +faststart "$bundle/airfield-pushback-tug-cradle-material-review.mp4"
