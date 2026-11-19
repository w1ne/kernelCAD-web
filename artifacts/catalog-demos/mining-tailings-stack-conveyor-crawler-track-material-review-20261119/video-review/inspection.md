# Demo inspection — 19 November 2026

## File check

- `ffprobe` reports H.264, 1280 × 720, 24 fps, yuv420p, no audio, and 15.125
  seconds (363 frames; 201,819 bytes).
- The exact probe output and SHA-256 are in this directory. The source slides,
  ffmpeg invocation, settings and generator are retained in `video-inputs/`,
  `demo-settings.json` and `make_demo.py`.

## Visual review

Inspected sampled frames from all four slides in
[`contact-sheet.png`](contact-sheet.png): the five preview audit, before/after
tailings stack conveyor render, material-role swatches and local verification.
The captions are readable at 1280 × 720. The before/after asset view preserves
the full equipment silhouette; the steel-versus-rubber value difference is
subtle in that full view, so the following slide explicitly labels the two
controls and their hex colors. The final slide says local software preview and
GLB regression only, with no deployment, process simulation, performance or
hardware acceptance claim.
