#!/usr/bin/env bash
set -euo pipefail

bundle=artifacts/catalog-demos/industrial-plant-compressed-air-receiver-material-review-20261111
ffmpeg -hide_banner -y \
  -loop 1 -framerate 24 -t 6 -i "$bundle/previews/before/compressed-air-receiver.png" \
  -loop 1 -framerate 24 -t 6 -i "$bundle/previews/after/compressed-air-receiver.png" \
  -filter_complex \
  "[0:v]pad=720:640:104:64:color=0xf0f4f8,drawbox=x=0:y=0:w=720:h=64:color=0x203848:t=fill,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='INDUSTRIAL PLANT / COMPRESSED AIR RECEIVER':fontcolor=white:fontsize=21:x=18:y=20,drawbox=x=0:y=576:w=720:h=64:color=0x203848:t=fill,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='BEFORE - vessel heads and nozzle necks use safety paint':fontcolor=white:fontsize=17:x=18:y=582,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='Local source render. Branch is not deployed.':fontcolor=white:fontsize=14:x=18:y=615[b];[1:v]pad=720:640:104:64:color=0xf0f4f8,drawbox=x=0:y=0:w=720:h=64:color=0x203848:t=fill,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='INDUSTRIAL PLANT / COMPRESSED AIR RECEIVER':fontcolor=white:fontsize=21:x=18:y=20,drawbox=x=0:y=576:w=720:h=64:color=0x203848:t=fill,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='AFTER - heads and nozzle necks share vessel steel':fontcolor=white:fontsize=17:x=18:y=582,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='Local source render. Branch is not deployed.':fontcolor=white:fontsize=14:x=18:y=615[a];[b][a]concat=n=2:v=1:a=0,format=yuv420p[v]" \
  -map "[v]" -r 24 -an -c:v libx264 -preset medium -crf 22 \
  -movflags +faststart "$bundle/demo.mp4"
