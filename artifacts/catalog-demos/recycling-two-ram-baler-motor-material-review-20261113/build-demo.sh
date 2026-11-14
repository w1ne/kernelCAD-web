#!/usr/bin/env bash
# Rebuild the review MP4 from the slides in this bundle (run from the bundle directory).
set -euo pipefail
ffmpeg -hide_banner -y \
  -loop 1 -framerate 24 -t 4 -i slides/01-audit-a.png \
  -loop 1 -framerate 24 -t 4 -i slides/02-audit-b.png \
  -loop 1 -framerate 24 -t 5 -i slides/03-before-after.png \
  -loop 1 -framerate 24 -t 4 -i slides/04-verification.png \
  -filter_complex "[0:v][1:v][2:v][3:v]concat=n=4:v=1:a=0,format=yuv420p[v]" \
  -map "[v]" -r 24 -c:v libx264 -crf 22 -movflags +faststart two-ram-baler-motor-material-review.mp4
