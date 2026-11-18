#!/usr/bin/env bash
set -euo pipefail

bundle_dir="$(cd "$(dirname "$0")" && pwd)"
font="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

ffmpeg -hide_banner -loglevel error -y \
  -loop 1 -framerate 30 -t 5 -i "$bundle_dir/previews/before/reverse-osmosis-skid.png" \
  -loop 1 -framerate 30 -t 6 -i "$bundle_dir/previews/after.png" \
  -filter_complex \
  "[0:v]drawtext=fontfile=$font:textfile=$bundle_dir/captions/before.txt:x=12:y=12:fontsize=15:fontcolor=white:box=1:boxcolor=black@0.78,drawtext=fontfile=$font:textfile=$bundle_dir/captions/footer-before.txt:x=12:y=34:fontsize=12:fontcolor=white:box=1:boxcolor=black@0.78[a];[1:v]drawtext=fontfile=$font:textfile=$bundle_dir/captions/after.txt:x=12:y=12:fontsize=14:fontcolor=white:box=1:boxcolor=black@0.78,drawtext=fontfile=$font:textfile=$bundle_dir/captions/footer-after.txt:x=12:y=34:fontsize=12:fontcolor=white:box=1:boxcolor=black@0.78[b];[a][b]concat=n=2:v=1:a=0,format=yuv420p[out]" \
  -map "[out]" -r 30 -c:v libx264 -crf 20 -movflags +faststart \
  "$bundle_dir/demo.mp4"

ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height,r_frame_rate,pix_fmt -of json \
  "$bundle_dir/demo.mp4" > "$bundle_dir/video-review/video-inspection.json"
