#!/usr/bin/env bash
set -euo pipefail

DEMO_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

ffmpeg -y -hide_banner -loglevel error \
  -i "${DEMO_DIR}/capture-raw.mp4" \
  -vf "drawbox=x=0:y=0:w=iw:h=56:color=black@0.58:t=fill,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:textfile=${DEMO_DIR}/title.txt:fontcolor=white:fontsize=23:x=24:y=16,drawbox=x=0:y=ih-78:w=iw:h=78:color=black@0.62:t=fill,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:textfile=${DEMO_DIR}/status.txt:fontcolor=white:fontsize=15:line_spacing=5:x=24:y=h-64" \
  -c:v libx264 -crf 22 -preset veryfast -pix_fmt yuv420p -movflags +faststart -an \
  "${DEMO_DIR}/demo.mp4"
