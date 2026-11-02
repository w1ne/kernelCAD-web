#!/usr/bin/env bash
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
demo_dir="$repo_root/catalog/kits/standard-components/demo"
preview_dir="$repo_root/catalog/kits/standard-components/previews"
fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf
tmp_dir=$(mktemp -d /tmp/kernelcad-standard-components-demo.XXXXXX)
trap 'rm -rf "$tmp_dir"' EXIT

if [[ ! -f "$fontfile" ]]; then
  printf 'Missing font file: %s\n' "$fontfile" >&2
  exit 1
fi

asset_ids=(angle-bracket pipe-tee handwheel timing-belt-pulley handle-pull)
caption_ids=(01-source 02-validate 03-catalog 04-previews 05-handoff)
for i in 0 1 2 3 4; do
  n=$((i + 1))
  frame=$(printf '%02d' "$n")
  caption=${caption_ids[$i]}
  ffmpeg -hide_banner -loglevel error -y \
    -f lavfi -i 'color=c=0xf1f4f6:s=1280x720:d=1' \
    -i "$preview_dir/${asset_ids[$i]}.png" \
    -filter_complex "[1:v]scale=600:600:force_original_aspect_ratio=decrease:flags=lanczos,pad=600:600:(ow-iw)/2:(oh-ih)/2:color=0xf1f4f6[asset];[0:v][asset]overlay=640:36,drawtext=fontfile=$fontfile:textfile=$demo_dir/captions/$caption.txt:expansion=none:fontcolor=0x17212b:fontsize=32:line_spacing=14:x=42:y=75:box=1:boxcolor=white@0.92:boxborderw=24,drawtext=text='Local validation and previews only | deployment pending PR merge | no hardware acceptance':x=44:y=680:fontcolor=0x46515d:fontsize=16" \
    -frames:v 1 "$tmp_dir/frame-$frame.png"
done

ffmpeg -hide_banner -loglevel error -y \
  -loop 1 -framerate 24 -t 3 -i "$tmp_dir/frame-01.png" \
  -loop 1 -framerate 24 -t 3 -i "$tmp_dir/frame-02.png" \
  -loop 1 -framerate 24 -t 3 -i "$tmp_dir/frame-03.png" \
  -loop 1 -framerate 24 -t 3 -i "$tmp_dir/frame-04.png" \
  -loop 1 -framerate 24 -t 3 -i "$tmp_dir/frame-05.png" \
  -filter_complex '[0:v]trim=duration=3,setpts=PTS-STARTPTS[v0];[1:v]trim=duration=3,setpts=PTS-STARTPTS[v1];[2:v]trim=duration=3,setpts=PTS-STARTPTS[v2];[3:v]trim=duration=3,setpts=PTS-STARTPTS[v3];[4:v]trim=duration=3,setpts=PTS-STARTPTS[v4];[v0][v1][v2][v3][v4]concat=n=5:v=1:a=0,format=yuv420p[out]' \
  -map '[out]' -an -c:v libx264 -preset fast -crf 21 -movflags +faststart \
  "$demo_dir/workflow.mp4"

ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height,r_frame_rate -of default=noprint_wrappers=1 "$demo_dir/workflow.mp4"
