# Compact MCP scene summary

[Watch the 12-second demo](demo.mp4). [Actual calls and results](calls.json),
[runner source](demo.ts), [recording settings and provenance](verification.json).

Run from the repository root: `npx tsx docs/demos/scene-summary/demo.ts`.
Uses Sharp for readable result slides and `/opt/homebrew/bin/ffmpeg` for H.264,
1280×720, 24 fps, four seconds per call. The runner calls the actual local MCP
dispatcher: build a 40×30×10 body, cut a radius-5 bore, then perform a dry run.

Captions distinguish actual local validation from deployment and hardware
acceptance. The video is a presentation of retained MCP JSON, not a Studio screen
recording or a simulation. It shows validity, volume, BREP faces and bounding size
on each build receipt; capture-only validation shows unavailable measurements.

Visual inspection: all three result slides and a decoded MP4 frame were checked. Text is legible and uncropped; the bore receipt shows 11,214.602 mm³ and seven faces, while the dry-run slide explicitly shows unavailable geometry. `ffprobe` confirmed H.264, 1280×720, 24 fps and 12 seconds.
