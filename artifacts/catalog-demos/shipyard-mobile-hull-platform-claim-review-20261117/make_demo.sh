#!/usr/bin/env bash
set -euo pipefail

bundle=artifacts/catalog-demos/shipyard-mobile-hull-platform-claim-review-20261117
python3 "$bundle/capture_demo.py"
ffmpeg -hide_banner -y \
  -loop 1 -framerate 24 -t 4 -i "$bundle/slides/01-five-preview-audit.png" \
  -loop 1 -framerate 24 -t 4 -i "$bundle/slides/02-platform-before-after.png" \
  -loop 1 -framerate 24 -t 4 -i "$bundle/slides/03-catalog-checks.png" \
  -filter_complex "[0:v][1:v][2:v]concat=n=3:v=1:a=0,format=yuv420p[v]" \
  -map "[v]" -r 24 -an -c:v libx264 -preset medium -crf 22 \
  -movflags +faststart "$bundle/shipyard-mobile-hull-platform-claim-review.mp4"
