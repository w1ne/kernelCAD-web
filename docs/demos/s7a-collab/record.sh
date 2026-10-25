#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
#
# Reproducible local demo for S7+S8 Part A. It builds a throwaway git repo from
# examples/collab/bracket-and-motor-plate.kcad.ts, creates three agent branches,
# runs the real `kernelcad collab check` CLI on each, and renders the captured
# CLI output to an MP4. This is a local replay of local validation; it does not
# show a deployed server or hosted queue.
set -euo pipefail

REPO="$(git rev-parse --show-toplevel)"
OUT="$(cd "$(dirname "$0")" && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

export PATH="$HOME/.nvm/versions/node/v22.23.4/bin:$PATH"
export NODE_NO_WARNINGS=1

git -C "$WORK" init -q
git -C "$WORK" config user.email demo@example.com
git -C "$WORK" config user.name demo
git -C "$WORK" checkout -q -b main
cp "$REPO/examples/collab/bracket-and-motor-plate.kcad.ts" "$WORK/bracket.kcad.ts"
git -C "$WORK" add bracket.kcad.ts
git -C "$WORK" commit -q -m base

edit_branch() {
  local branch="$1" from="$2" sed_expr="$3"
  git -C "$WORK" checkout -q "$from"
  git -C "$WORK" checkout -q -b "$branch"
  sed -i "$sed_expr" "$WORK/bracket.kcad.ts"
  git -C "$WORK" add bracket.kcad.ts
  git -C "$WORK" commit -q -m "$branch"
}
edit_branch fillet main "s/param('bracketFillet', 1.0/param('bracketFillet', 1.2/"
edit_branch hole-move main "s/param('bracketHoleX', 12/param('bracketHoleX', 14/"
edit_branch head-hole main "s/param('bracketHoleX', 12/param('bracketHoleX', 15/"
edit_branch other-hole main "s/param('bracketHoleX', 12/param('bracketHoleX', 16/"
git -C "$WORK" checkout -q main

run_case() {
  local name="$1" base="$2" head="$3" yours="$4"
  {
    echo "\$ kernelcad collab check --file bracket.kcad.ts --base $base --head $head --yours $yours"
    (cd "$WORK" && npx --prefix "$REPO" tsx "$REPO/src/agent/cli/index.ts" collab check \
      --file bracket.kcad.ts --base "$base" --head "$head" --yours "$yours") 2>&1 || true
  } > "$OUT/$name.txt"
}

run_case 01-pass main main fillet
run_case 02-reject main main hole-move
run_case 03-conflict main head-hole other-hole

{
  echo "S7 + S8 Part A — local collab check (replay of local validation)"
  echo
  echo "1) Disjoint bracket fillet edit: passes and would be written with --out."
  echo
  cat "$OUT/01-pass.txt"
  echo
  echo "2) Bracket hole moved 2 mm: rejected by the shared hole-pattern requirement."
  echo
  cat "$OUT/02-reject.txt"
  echo
  echo "3) Two branches set bracketHoleX differently: hard conflict with base/head/yours."
  echo
  cat "$OUT/03-conflict.txt"
} > "$OUT/transcript.txt"

rm -rf "$OUT/frames"
mkdir -p "$OUT/frames"
slide() {
  local n="$1" title="$2" body="$3"
  {
    printf '%s\n\n' "$title"
    cat "$body"
  } > "$WORK/slide-$n.txt"
  convert -background '#101418' -fill '#e8edf2' -font DejaVu-Sans-Mono -pointsize 19 \
    -size 1280x720 -gravity northwest caption:"$(cat "$WORK/slide-$n.txt")" \
    -bordercolor '#101418' -border 24 "$OUT/frames/$n.png"
}

slide 1 "S7 + S8 Part A — local collab check" "$OUT/01-pass.txt"
slide 2 "1/3  Disjoint fillet edit -> PASS (merged written on --out)" "$OUT/01-pass.txt"
slide 3 "2/3  Hole moved 2 mm -> REJECT by hole-pattern" "$OUT/02-reject.txt"
slide 4 "3/3  Same param, different values -> HARD CONFLICT" "$OUT/03-conflict.txt"

ffmpeg -y -loglevel error \
  -loop 1 -t 2.5 -i "$OUT/frames/1.png" \
  -loop 1 -t 5 -i "$OUT/frames/2.png" \
  -loop 1 -t 5 -i "$OUT/frames/3.png" \
  -loop 1 -t 5 -i "$OUT/frames/4.png" \
  -filter_complex "[0:v]fps=30,format=yuv420p[v0];[1:v]fps=30,format=yuv420p[v1];[2:v]fps=30,format=yuv420p[v2];[3:v]fps=30,format=yuv420p[v3];[v0][v1][v2][v3]concat=n=4:v=1:a=0[out]" \
  -map "[out]" -c:v libx264 -preset veryfast -crf 26 -movflags +faststart "$OUT/collab-check.mp4"

ffprobe -v error -show_entries format=duration:stream=width,height,codec_name -of default=noprint_wrappers=1 "$OUT/collab-check.mp4" > "$OUT/ffprobe.txt"
echo "wrote $OUT/collab-check.mp4"
