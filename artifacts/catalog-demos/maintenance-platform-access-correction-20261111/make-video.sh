#!/usr/bin/env bash
set -euo pipefail

bundle_dir="$(cd "$(dirname "$0")" && pwd)"
font="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

ffmpeg -hide_banner -loglevel warning -y \
  -loop 1 -framerate 24 -t 3 -i "$bundle_dir/previews/before.png" \
  -loop 1 -framerate 24 -t 3 -i "$bundle_dir/previews/after.png" \
  -loop 1 -framerate 24 -t 3 -i "$bundle_dir/previews/after-alternate-view.png" \
  -filter_complex \
  "[0:v]drawbox=x=0:y=0:w=iw:h=56:color=0x203040@0.92:t=fill,drawtext=fontfile=$font:text='BEFORE - one isolated step':fontcolor=white:fontsize=20:x=16:y=17[v0];[1:v]drawbox=x=0:y=0:w=iw:h=56:color=0x203040@0.92:t=fill,drawtext=fontfile=$font:text='AFTER - three-tread stair and supported rails':fontcolor=white:fontsize=18:x=16:y=18[v1];[2:v]drawbox=x=0:y=0:w=iw:h=56:color=0x203040@0.92:t=fill,drawtext=fontfile=$font:text='SAME MODEL - alternate view':fontcolor=white:fontsize=20:x=16:y=17[v2];[v0][v1][v2]concat=n=3:v=1:a=0[out]" \
  -map "[out]" -r 24 -c:v libx264 -pix_fmt yuv420p -movflags +faststart \
  "$bundle_dir/maintenance-platform-access-correction.mp4"
