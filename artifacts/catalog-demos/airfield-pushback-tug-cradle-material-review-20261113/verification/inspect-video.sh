#!/usr/bin/env bash
set -euo pipefail

bundle=artifacts/catalog-demos/airfield-pushback-tug-cradle-material-review-20261113
video="$bundle/airfield-pushback-tug-cradle-material-review.mp4"
ffprobe -v error -show_streams -show_format -of json "$video" > "$bundle/video-review/video-metadata.json"
ffmpeg -hide_banner -y -i "$video" -vf "fps=1/3,scale=720:-1" -frames:v 6 \
  "$bundle/video-review/frame-%02d.png" > "$bundle/video-review/frame-extract.log" 2>&1
python3 "$bundle/video-review/make-contact-sheet.py"
