#!/bin/sh
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
set -eu

bundle_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
python3 "$bundle_dir/render-demo.py"

ffmpeg -hide_banner -loglevel error -y \
  -loop 1 -framerate 24 -t 3 -i "$bundle_dir/slide-intro.png" \
  -loop 1 -framerate 24 -t 3 -i "$bundle_dir/slide-static-hold.png" \
  -loop 1 -framerate 24 -t 4 -i "$bundle_dir/slide-result.png" \
  -filter_complex \
    '[0:v]fps=24,format=yuv420p[v0];[1:v]fps=24,format=yuv420p[v1];[2:v]fps=24,format=yuv420p[v2];[v0][v1][v2]concat=n=3:v=1:a=0[out]' \
  -map '[out]' -t 10 -an -c:v libx264 -preset medium -crf 24 \
  -pix_fmt yuv420p -movflags +faststart "$bundle_dir/demo.mp4"

ffprobe -v error -select_streams v:0 \
  -show_entries stream=codec_name,width,height,pix_fmt,r_frame_rate,duration \
  -of json "$bundle_dir/demo.mp4"
