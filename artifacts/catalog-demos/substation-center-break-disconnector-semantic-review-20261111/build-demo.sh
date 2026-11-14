#!/usr/bin/env bash
set -euo pipefail

ffmpeg -hide_banner -y \
  -loop 1 -framerate 24 -t 5 \
  -i artifacts/catalog-demos/substation-center-break-disconnector-semantic-review-20261111/previews/before.png \
  -loop 1 -framerate 24 -t 5 \
  -i artifacts/catalog-demos/substation-center-break-disconnector-semantic-review-20261111/previews/after.png \
  -loop 1 -framerate 24 -t 5 \
  -i artifacts/catalog-demos/substation-center-break-disconnector-semantic-review-20261111/previews/closed.png \
  -filter_complex \
  "[0:v]pad=720:640:104:64:color=0xf0f4f8,drawbox=x=0:y=0:w=720:h=64:color=0x203848:t=fill,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='GRID SUBSTATION / CENTER-BREAK DISCONNECTOR':fontcolor=white:fontsize=21:x=18:y=20,drawbox=x=0:y=576:w=720:h=64:color=0x203848:t=fill,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='BEFORE / copper bar floats above fixed insulators':fontcolor=white:fontsize=18:x=18:y=584,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='Existing source preview / local software render':fontcolor=white:fontsize=14:x=18:y=611[b];[1:v]pad=720:640:104:64:color=0xf0f4f8,drawbox=x=0:y=0:w=720:h=64:color=0x203848:t=fill,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='GRID SUBSTATION / CENTER-BREAK DISCONNECTOR':fontcolor=white:fontsize=21:x=18:y=20,drawbox=x=0:y=576:w=720:h=64:color=0x203848:t=fill,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='AFTER / paired aluminum arms seated on porcelain posts':fontcolor=white:fontsize=18:x=18:y=584,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='Open center gap / generic KernelCAD visualization':fontcolor=white:fontsize=14:x=18:y=611[a];[2:v]pad=720:640:104:64:color=0xf0f4f8,drawbox=x=0:y=0:w=720:h=64:color=0x203848:t=fill,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='GRID SUBSTATION / CENTER-BREAK DISCONNECTOR':fontcolor=white:fontsize=21:x=18:y=20,drawbox=x=0:y=576:w=720:h=64:color=0x203848:t=fill,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='PARAMETER / closed state brings both contact pairs together':fontcolor=white:fontsize=18:x=18:y=584,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='Local preview render / not electrically simulated or deployed':fontcolor=white:fontsize=14:x=18:y=611[c];[b][a][c]concat=n=3:v=1:a=0,format=yuv420p[v]" \
  -map "[v]" -r 24 -an -c:v libx264 -preset medium -crf 22 \
  -movflags +faststart \
  artifacts/catalog-demos/substation-center-break-disconnector-semantic-review-20261111/demo.mp4
