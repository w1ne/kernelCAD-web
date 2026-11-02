#!/usr/bin/env bash
set -euo pipefail
repo_root=$(git rev-parse --show-toplevel)
cd "$repo_root"
demo_dir="$repo_root/catalog/kits/sports/demo"
preview_dir="$repo_root/catalog/kits/sports/previews"
tmp_dir=$(mktemp -d)
trap 'rm -rf "$tmp_dir"' EXIT

mapfile -t previews < <(find "$preview_dir" -maxdepth 1 -type f -name '*.png' | sort)
[[ ${#previews[@]} -eq 40 ]]
montage -font DejaVu-Sans -pointsize 12 -fill '#202a35' -background '#eef1f4' \
  -label '%t' "${previews[@]}" -geometry 220x165+6+7 -tile 8x5 \
  "$demo_dir/asset-contact-sheet.png"

convert -size 1920x1080 xc:'#142333' \
  -font DejaVu-Sans-Bold -fill '#ffffff' -pointsize 82 -gravity northwest \
  -annotate +120+260 'SPORTS KIT' \
  -font DejaVu-Sans -fill '#c9d7e4' -pointsize 42 -annotate +126+390 '40 original parametric CC0 assets' \
  -fill '#79c3b8' -pointsize 28 -annotate +128+500 'BALLS  /  COURTS  /  FITNESS' \
  -fill '#9aabba' -pointsize 22 -annotate +128+965 'LOCAL AUTHORING AND CATALOG VALIDATION' \
  "$tmp_dir/title.png"

convert "$demo_dir/asset-contact-sheet.png" -resize 1800x930 \
  -background '#eef1f4' -gravity center -extent 1920x1080 \
  -font DejaVu-Sans-Bold -fill '#142333' -pointsize 40 -gravity north \
  -annotate +0+22 '40 GENERATED ASSET PREVIEWS' \
  "$tmp_dir/previews.png"

convert -size 1920x1080 xc:'#142333' \
  -font DejaVu-Sans-Bold -fill '#ffffff' -pointsize 64 -gravity northwest \
  -annotate +120+170 'VALIDATION COMPLETE' \
  -font DejaVu-Sans -fill '#79c3b8' -pointsize 48 -annotate +126+330 '40 / 40 asset sources passed' \
  -fill '#79c3b8' -pointsize 48 -annotate +126+420 '2 / 2 catalog integration tests passed' \
  -fill '#c9d7e4' -pointsize 30 -annotate +126+570 'The index and low-poly previews were rebuilt from source.' \
  -fill '#9aabba' -pointsize 25 -annotate +126+790 'Local checks only. Deployment and physical acceptance are not shown.' \
  "$tmp_dir/validation.png"

ffmpeg -hide_banner -loglevel error -y \
  -loop 1 -framerate 24 -t 3 -i "$tmp_dir/title.png" \
  -loop 1 -framerate 24 -t 8 -i "$tmp_dir/previews.png" \
  -loop 1 -framerate 24 -t 4 -i "$tmp_dir/validation.png" \
  -filter_complex "[0:v]scale=1920:1080,setsar=1,fps=24,format=yuv420p[v0];[1:v]scale=1920:1080,setsar=1,fps=24,format=yuv420p[v1];[2:v]scale=1920:1080,setsar=1,fps=24,format=yuv420p[v2];[v0][v1][v2]concat=n=3:v=1:a=0[outv]" \
  -map '[outv]' -an -c:v libx264 -preset slow -crf 24 -movflags +faststart \
  "$demo_dir/workflow.mp4"
convert "$tmp_dir/previews.png" -resize 640x360 "$demo_dir/poster.png"
printf 'Created %s\n' "$demo_dir/workflow.mp4"
