#!/usr/bin/env bash
# Rebuild the run_cfd demo: CFD runs + validation (record.ts), renders of the
# part and its extracted fluid volume, frames, MP4. Needs OpenFOAM (native or
# `docker pull opencfd/openfoam-run:2406`), Playwright Chromium and ffmpeg.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../../.." && pwd)"
work="${1:-/tmp/kernelcad-cfd-demo}"
cd "$root"
npx tsx docs/demos/cfd-manifold/record.ts "$work"
npx tsx src/agent/cli/index.ts render docs/demos/cfd-manifold/manifold.kcad.ts --preset publish --background dark --width 1200 --height 800 -o "$work/model.png"
npx tsx src/agent/cli/index.ts render docs/demos/cfd-manifold/fluid-volume.kcad.ts --preset publish --background dark --width 1200 --height 800 -o "$work/fluid.png"
npx tsx docs/demos/cfd-manifold/frames.ts "$work/model.png" "$work/fluid.png" "$here/frames"
ffmpeg -y -loglevel error -framerate 1/3.5 -i "$here/frames/frame-%d.png" -vf "fps=24,format=yuv420p" -c:v libx264 "$here/demo.mp4"
ffprobe -v error -show_entries format=duration:stream=width,height,codec_name -of default=nw=1 "$here/demo.mp4" > "$here/ffprobe.txt"
cat "$here/ffprobe.txt"
