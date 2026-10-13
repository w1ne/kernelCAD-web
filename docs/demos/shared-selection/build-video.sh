#!/bin/sh
set -eu
cd "$(dirname "$0")"
# Captioned replay of actual local Studio captures, not continuous video.
python3 caption-frames.py
ffmpeg -y -loglevel error -loop 1 -t 3 -i frame-1.png -loop 1 -t 4 -i frame-2.png -loop 1 -t 4 -i frame-3.png -filter_complex '[0:v][1:v][2:v]concat=n=3:v=1:a=0,format=yuv420p[v]' -map '[v]' -r 24 -c:v libx264 -crf 20 -preset fast -movflags +faststart selection.mp4
ffprobe -v error -show_entries stream=codec_name,width,height -show_entries format=duration -of json selection.mp4 > video-verification.json
ffmpeg -y -loglevel error -ss 8 -i selection.mp4 -frames:v 1 video-inspection.png
