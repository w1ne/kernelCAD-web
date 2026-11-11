# Preview and MP4 inspection

- Opened the five checked-in water-treatment sample previews listed in the
  2026-11-11 quality ledger.
- Opened `previews/before.png` and `previews/after.png`. The before preview reads
  as a level trough, hopper, and cylinder. The after preview clearly exposes the
  stainless inclined helical screw and raised discharge chute in color.
- Generated `demo.mp4` using `bash create-demo.sh`; `ffprobe` reports H.264,
  1280×720, 24 fps, 8.000 seconds.
- Extracted and opened `video-review/frame-1.png` and `frame-2.png`. Both cards
  render without clipping; labels distinguish BEFORE/AFTER and identify the
  local preview scope. The after card makes the screw visible in both the full
  scene and the detail crop.
- Visual review covers catalog render and video only. No deployment, treatment
  performance, vendor-dimension, equipment-safety, or physical acceptance is
  implied.
