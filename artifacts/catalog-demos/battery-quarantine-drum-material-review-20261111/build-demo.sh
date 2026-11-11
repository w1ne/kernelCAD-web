#!/usr/bin/env bash
set -euo pipefail

ffmpeg -hide_banner -y \
  -loop 1 -framerate 24 -t 6 \
  -i artifacts/catalog-demos/battery-quarantine-drum-material-review-20261111/previews/before.png \
  -loop 1 -framerate 24 -t 6 \
  -i artifacts/catalog-demos/battery-quarantine-drum-material-review-20261111/previews/after.png \
  -filter_complex \
  "[0:v]pad=720:640:104:64:color=0xf0f4f8,drawbox=x=0:y=0:w=720:h=64:color=0x203848:t=fill,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='RECYCLING FACILITY / BATTERY QUARANTINE DRUM':fontcolor=white:fontsize=22:x=18:y=20,drawbox=x=0:y=576:w=720:h=64:color=0x203848:t=fill,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='BEFORE - sack and alarm share a yellow finish':fontcolor=white:fontsize=18:x=18:y=584,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='Local preview render | branch not deployed':fontcolor=white:fontsize=14:x=18:y=611[b];[1:v]pad=720:640:104:64:color=0xf0f4f8,drawbox=x=0:y=0:w=720:h=64:color=0x203848:t=fill,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='RECYCLING FACILITY / BATTERY QUARANTINE DRUM':fontcolor=white:fontsize=22:x=18:y=20,drawbox=x=0:y=576:w=720:h=64:color=0x203848:t=fill,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='AFTER - kraft-paper sack is distinct from alarm paint':fontcolor=white:fontsize=18:x=18:y=584,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='Local preview render | branch not deployed':fontcolor=white:fontsize=14:x=18:y=611[a];[b][a]concat=n=2:v=1:a=0,format=yuv420p[v]" \
  -map "[v]" -r 24 -an -c:v libx264 -preset medium -crf 22 \
  -movflags +faststart \
  artifacts/catalog-demos/battery-quarantine-drum-material-review-20261111/demo.mp4
