#!/usr/bin/env bash
# Rebuild the review MP4 from the slides in this bundle (run from the bundle directory).
# Slides are produced by make-slides.py (audit, beforeafter, verify <lines.txt>).
set -euo pipefail
ffmpeg -hide_banner -y \
  -loop 1 -framerate 24 -t 5 -i slides/01-audit.png \
  -loop 1 -framerate 24 -t 6 -i slides/02-before-after.png \
  -loop 1 -framerate 24 -t 5 -i slides/03-verification.png \
  -filter_complex "[0:v][1:v][2:v]concat=n=3:v=1:a=0,format=yuv420p[v]" \
  -map "[v]" -r 24 -c:v libx264 -crf 22 -movflags +faststart sanitary-filter-housing-material-review.mp4
