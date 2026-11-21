#!/usr/bin/env bash
set -euo pipefail

bundle_dir="$(cd "$(dirname "$0")" && pwd)"
python3 "$bundle_dir/make_review_assets.py"
args=()
filters=""
slides=(
  "slide-01-audit.png"
  "slide-02-full-before-after.png"
  "slide-03-rotor-detail.png"
  "slide-04-regression.png"
  "slide-05-scope.png"
)
for index in "${!slides[@]}"; do
  args+=(-loop 1 -t 2.8 -i "$bundle_dir/video-inputs/${slides[$index]}")
  filters+="[${index}:v]scale=1280:720,setsar=1,format=yuv420p[v${index}];"
done
concat=""
for index in "${!slides[@]}"; do concat+="[v${index}]"; done
ffmpeg -y -loglevel error "${args[@]}" \
  -filter_complex "${filters}${concat}concat=n=${#slides[@]}:v=1:a=0[out]" \
  -map '[out]' -r 25 -c:v libx264 -crf 22 -pix_fmt yuv420p \
  "$bundle_dir/recycling-glass-breaker-flails-material-review.mp4"
