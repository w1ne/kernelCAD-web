#!/usr/bin/env bash
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VIDEO="$HERE/recycling-glass-screening-motor-cap-material-review.mp4"
OUT="$HERE/video-review"
mkdir -p "$OUT"
ffprobe -v error -show_entries format=duration,size -show_entries stream=width,height,avg_frame_rate -of json "$VIDEO" > "$OUT/video-metadata.json"
for entry in "01 1.0" "02 4.0" "03 7.0" "04 10.0" "05 14.0"; do
  read -r number time <<< "$entry"
  ffmpeg -y -loglevel error -ss "$time" -i "$VIDEO" -frames:v 1 "$OUT/frame-$number.png"
done
python3 "$OUT/make-contact-sheet.py"
