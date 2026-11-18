#!/usr/bin/env bash
set -euo pipefail

bundle=artifacts/catalog-demos/water-treatment-sludge-thickener-drive-material-review-20261113
video="$bundle/water-treatment-sludge-thickener-drive-material-review.mp4"
ffprobe -v error -select_streams v:0 \
  -show_entries stream=codec_name,width,height,pix_fmt,r_frame_rate,duration \
  -show_entries format=duration,size -of json "$video" \
  > "$bundle/video-review/video-metadata.json"
ffmpeg -hide_banner -loglevel error -y -ss 2 -i "$video" -frames:v 1 "$bundle/video-review/frame-01.png"
ffmpeg -hide_banner -loglevel error -y -ss 5.5 -i "$video" -frames:v 1 "$bundle/video-review/frame-02.png"
ffmpeg -hide_banner -loglevel error -y -ss 9.5 -i "$video" -frames:v 1 "$bundle/video-review/frame-03.png"
ffmpeg -hide_banner -loglevel error -y -ss 13.5 -i "$video" -frames:v 1 "$bundle/video-review/frame-04.png"
ffmpeg -hide_banner -loglevel error -y -ss 16 -i "$video" -frames:v 1 "$bundle/video-review/frame-05.png"
python3 "$bundle/video-review/make-contact-sheet.py"
