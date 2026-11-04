# `plan_cnc_toolpaths` demonstration bundle

Local playback of the bounding-box mill planner. A 40 × 30 × 10 mm box sits
centered on a 50 × 40 × 15 mm plate. A 6 mm end mill faces the stock top down
to the part top, then profiles the rectangle. The MP4 draws those polylines.
View the [demonstration](demo.mp4).

This is a local heuristic playback. It is not collision-checked, not a
deployed service, and not a cut on a machine. Mill G-code here is separate
from the FDM slicer export.

## Reproduce

```sh
export PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:$PATH
npx tsx docs/demos/cnc-cam-pr1/demo.ts
for f in docs/demos/cnc-cam-pr1/frames/frame-*.svg; do
  rsvg-convert -w 1280 -h 720 -o "${f%.svg}.png" "$f"
done
rsvg-convert -w 1280 -h 720 -o docs/demos/cnc-cam-pr1/poster.png docs/demos/cnc-cam-pr1/poster.svg
ffmpeg -y -framerate 12 -i docs/demos/cnc-cam-pr1/frames/frame-%03d.png \
  -pix_fmt yuv420p docs/demos/cnc-cam-pr1/demo.mp4
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1 docs/demos/cnc-cam-pr1/demo.mp4
```

`result.json` keeps the planner summary. `toolpath.nc` is the emitted mill
program for this one fixture. `frames/` is generated and is not source.
