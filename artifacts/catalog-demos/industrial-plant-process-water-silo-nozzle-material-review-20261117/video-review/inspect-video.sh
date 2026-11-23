#!/usr/bin/env bash
set -euo pipefail

D="$(cd "$(dirname "$0")/.." && pwd)"
V="$D/video-review"
MP4="$D/industrial-plant-process-water-silo-nozzle-material-review.mp4"

ffprobe -v error -show_streams -show_format -of json "$MP4" > "$V/ffprobe.json"
for entry in "1.4:01" "4.2:02" "7.0:03" "9.8:04" "12.6:05"; do
  time="${entry%%:*}"
  frame="${entry#*:}"
  ffmpeg -y -loglevel error -ss "$time" -i "$MP4" -frames:v 1 -update 1 "$V/frame-$frame.png"
done
python3 "$V/make_contact_sheet.py"
ffmpeg -v error -i "$MP4" -f null - 2> "$V/decode.txt"
printf 'ffmpeg decode exit status: 0\n' >> "$V/decode.txt"
