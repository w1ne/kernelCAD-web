# Agent workflow visual evidence

Each MP4 is a short replay of actual captured pages, evaluated geometry and retained
local tool results. These videos distinguish local previews, public setup readback,
slicer predictions and modeled geometric installation from hosted or hardware proof.

- `reference-and-setup.mp4`: local registry reference, search, exact export input schema,
  and the existing public Claude setup at `app.kernelcad.com/connect?client=claude`.
- `design-guidance.mp4`: recipe retrieval, dated manufacturing sources and an evaluated
  non-overlapping L-bracket rendered by the existing demo-player pipeline.
- `gcode-estimates.mp4`: actual OrcaSlicer 2.4.2 export of a 20 × 20 × 10 mm coupon,
  150,314 retained bytes, 596 seconds predicted time, 2.03 g predicted filament,
  50 layers, 10 mm max Z. Generic FDM / PLA / 0.2 mm layers / 15% infill / no supports.
- `fastener-installation.mp4`: explicit two-station BREP audit, a 1.5 mm floating head,
  source repair and measured rerun. Repaired receiver overlap 2.4 mm and protrusion
  1.1 mm. Threads are simplified; no physical installation or strength certification.

The catalog preparation and audit invocation are in
`docs/features/agent-manufacturing-workflows.md`; the reproducible example is
`examples/fastener-installation/l-bracket-mount.kcad.ts`. The evidence ZIP retains
sources, STEP, drawing and before/after JSON. A manifest records checksums and capture
provenance. Source tests, local builds, deployment readback and physical tests are
separate gates.

Capture reused an already running Chrome session in short-lived owned tabs. Model
meshes and screenshots use the existing `meshForHeadlessRender` and demo-player bridge;
ffmpeg encodes the inspected frames. User browser processes remain running.
