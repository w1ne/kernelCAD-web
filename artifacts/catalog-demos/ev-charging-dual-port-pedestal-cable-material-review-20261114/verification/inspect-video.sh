#!/usr/bin/env bash
# Decode five review frames from the MP4 into video-review/ (gitignored, regenerable).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VIDEO="$HERE/ev-charging-dual-port-pedestal-cable-material-review.mp4"
OUT="$HERE/video-review"
mkdir -p "$OUT"
ffprobe -v error -show_entries format=duration,size -show_entries stream=width,height,avg_frame_rate -of json "$VIDEO" > "$OUT/video-metadata.json"
for entry in "01 1.0" "02 4.0" "03 7.0" "04 11.0" "05 15.0"; do
  read -r number time <<< "$entry"
  ffmpeg -y -loglevel error -ss "$time" -i "$VIDEO" -frames:v 1 "$OUT/frame-$number.png"
done
