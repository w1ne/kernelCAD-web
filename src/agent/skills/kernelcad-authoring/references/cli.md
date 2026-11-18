# kernelCAD authoring reference — CLI and animation

kernelcad CLI commands and animationView timelines.

## CLI Commands

```bash
# Run a script and report features + diagnostics
kernelcad evaluate path/to/script.kcad.ts

# Same, but JSON output (machine-readable)
kernelcad evaluate path/to/script.kcad.ts --json

# Export to a file in the chosen format
kernelcad export stl  path/to/script.kcad.ts -o /tmp/out.stl
kernelcad export step path/to/script.kcad.ts -o /tmp/out.step
kernelcad export dxf  path/to/script.kcad.ts -o /tmp/out.dxf   # flat part / cut list / sheet metal; laser / waterjet / CNC
kernelcad export dxf  path/to/script.kcad.ts -o /tmp/plan.dxf --options '{"section":{"axis":"z","at":25}}'  # cross-section of any part at z = 25
kernelcad export 3mf  path/to/script.kcad.ts -o /tmp/out.3mf   # slicer mesh with per-part colors
kernelcad export glb  path/to/script.kcad.ts -o /tmp/out.glb   # web / AR viewer; PBR materials
kernelcad export ply  path/to/script.kcad.ts -o /tmp/out.ply   # MeshLab / Blender / trimesh mesh; normals + part colours, assemblies merged in world space
kernelcad export ply  path/to/script.kcad.ts -o /tmp/out.ply --options '{"encoding":"ascii","colors":"face"}'
kernelcad export stl  path/to/script.kcad.ts --part lever -o /tmp/lever.stl  # one solved-assembly part (world-frame); repeat --part with -o <dir> for a subset
kernelcad export stl  path/to/script.kcad.ts --parts all -o /tmp/parts/      # every assembly part as <dir>/<part>.stl
kernelcad export stl  path/to/script.kcad.ts -o /tmp/out.stl --no-verify     # skip the default-on watertight verify gate
kernelcad export step path/to/script.kcad.ts -o /tmp/out.step --quality-gate block  # fail (write nothing) on tiny faces / short edges; default warn, off skips
kernelcad export stl  path/to/script.kcad.ts -o /tmp/out.stl --tiny-face-area-mm2 0.05 --short-edge-length-mm 0.2  # quality gate thresholds
kernelcad parts path/to/script.kcad.ts --json                  # list assembly parts with bbox, volume, surface area, triangle count

# Render a 4-view PNG (front/right/top/iso) for visual review.
# Tiles are framed to the requested --width/--height: the camera fits the
# visible geometry to the output aspect and the capture is center-cropped,
# so the default 1024×1024 square tiles frame correctly.
kernelcad render path/to/script.kcad.ts -o /tmp/out.png

# All seven views (adds back, left, bottom) in one labelled inspection sheet.
kernelcad render path/to/script.kcad.ts -o /tmp/sheet.png --sheet

# Clip the model with a section plane to expose interiors in headless captures.
# Keeps the negative-axis side by default; --section-flip keeps the positive side.
kernelcad render path/to/script.kcad.ts -o /tmp/cut.png --section z=10

# Share-ready studio hero shot (same preset as render_preview preset: 'publish'):
# one 3/4 PNG, 1600×1200 by default (--width/--height up to 2048). --background
# white|light|dark|black|transparent|#rrggbb and --no-shadow apply only with
# --preset publish; --separate / --pose render those views in the publish look.
kernelcad render path/to/script.kcad.ts --preset publish -o /tmp/hero.png
kernelcad render path/to/script.kcad.ts --preset publish --background transparent --no-shadow -o /tmp/hero.png

# Interrogate an external STEP file before placement: solid tree, per-solid
# exact bbox + volume, cylindrical holes (axis, diameter, depth, blind/through)
kernelcad inspect step path/to/part.step

# Rebuild an editable feature-tree script from an STL / OBJ / 3MF mesh, verified
# against the mesh (volume IoU + surface deviation; --strict exits 1 unless faithful)
kernelcad reconstruct path/to/part.stl -o /tmp/part.kcad.ts

# Detect BREP interferences between Scene parts (industry-standard clash check)
kernelcad interference path/to/script.kcad.ts

# Validate the assembly: floating parts, orphan clusters, interferences (v0.5 MVP)
kernelcad validate path/to/script.kcad.ts

# Run the print-readiness gates declared by the script's dfmSpec()
# (exit 0 pass / 1 gate failed / 2 no dfmSpec declared; --json for the full report)
kernelcad dfm path/to/script.kcad.ts

# Capture the script's animationView({...}) timeline to MP4 (ffmpeg), verifying
# the sampled poses for part interference (exit 0 clean / 1 collisions / 2 could
# not capture). Requires a running studio dev server (npm run dev).
kernelcad animate path/to/script.kcad.ts -o /tmp/out.mp4
kernelcad animate path/to/script.kcad.ts --frames /tmp/frames   # PNG sequence; no ffmpeg
kernelcad animate path/to/script.kcad.ts --no-verify            # skip the pose-interference gate
kernelcad animate path/to/script.kcad.ts --hide wall,cap        # hide parts in the frames (cutaway); --focus shows only the named parts (mutually exclusive; verification still runs on the full model)

# Seamless 360° turntable of the model (same engine as capture_animation turntable: true);
# .gif out → GIF, otherwise MP4; --frames keeps a transparent backdrop. Publish look by
# default; --width/--height (1080), --fps (30), --duration-ms (6000), --elevation (22),
# --background, --no-shadow, --preset default, --environment are turntable-only flags.
kernelcad animate path/to/script.kcad.ts /tmp/spin.gif --turntable --width 640 --height 640 --fps 15

# Run the MCP server (stdio transport)
kernelcad mcp
```

For static renders and turntables, set `PW_CDP_URL` to an already-running
Chrome's CDP endpoint after verifying it is available. The capture uses that
browser's existing context and closes its own tab on completion. An explicit
attachment failure is reported; it does not launch a second browser.

## Animation timelines (animationView)

`animationView({...})` declares a kinematic-motion timeline that
`kernelcad animate` (or the `capture_animation` MCP tool) renders to an MP4 or
a PNG frame sequence. Display only —
and the captured artifact is evidence of the motion, not a design source.

Use the keyframe-track form for a mechanism cycle: each track animates one
NUMERIC `param()` through `{ atMs, value, ease? }` keys on one shared timeline.

```typescript
const drumDeg  = param('drumDeg', 0, { min: 0, max: 360 });
const swingDeg = param('swingDeg', 0, { min: 0, max: 40 });
// ... build the assembly so drumDeg / swingDeg drive its mates ...

animationView({
  name: 'dispense cycle',
  tracks: [
    // Drum eases in to 60 deg, dwells (hold) to 1400 ms, then eases back to 0.
    { param: 'drumDeg', keys: [
      { atMs: 0,    value: 0 },
      { atMs: 800,  value: 60, ease: 'easeInOut' },
      { atMs: 1400, value: 60 },                    // dwell: value repeated → no motion
      { atMs: 2200, value: 0,  ease: 'easeInOut' },
    ] },
    // Meter swings out while the drum dwells, then snaps closed (step).
    { param: 'swingDeg', keys: [
      { atMs: 800,  value: 0 },
      { atMs: 1400, value: 35, ease: 'easeOut' },
      { atMs: 1600, value: 0,  ease: 'step' },      // step: holds, then jumps at arrival
    ] },
  ],
  fps: 30,
});
```

**Ease semantics.** `ease` applies to the segment ENDING at the key ("arrive
with this easing", default `linear`); the value holds (clamp) before the first
key and after the last. `step` holds the previous value until it jumps exactly
at the key. A dwell is two consecutive keys with the same value.

**Validation (throws at capture time).** Every track param must be a NUMERIC
`param()` declared earlier (`animation.param.unknown`); a param may appear in at
most one track (`animation.track.duplicate-param`); empty tracks/keys, non-finite
or negative `atMs`, **duplicate `atMs` within a track**, and unknown `ease`
throw `animation.keys.invalid`. Key values outside the param's declared min/max
clamp to the boundary with an `animation.value.clamped` warn. Multiple
`animationView()` calls keep the LAST record and warn `animation.view.shadowed`.

**Capture (`kernelcad animate <file> [out.mp4]`).** MP4 via ffmpeg by default;
`--frames <dir>` writes a PNG sequence and skips ffmpeg entirely (use when
ffmpeg is unavailable). `--fps <n>` overrides the record's fps. `--focus <names>` /
`--hide <names>` isolate parts in the rendered frames (comma-separated feature ids
or assembly part names, mutually exclusive — same semantics as `kernelcad render`;
use for cutaways like an internal drum behind a frosted wall). Visibility is
render-only and does NOT affect the pose-interference verification, which always
runs against the full model. Exit codes:
`0` = captured + verification clean (or skipped), `1` = captured but the pose
gate found collisions (the MP4/frames ARE still written as evidence), `2` =
could not capture at all (bad args, build error, no `animationView` record, an
unsolvable pose, ffmpeg missing, browser bootstrap failure). Like
`kernelcad render`, capture drives a headless browser against a **running
studio dev server** (`npm run dev`; honors `VITE_PORT` / `PW_CDP_URL`).

**Motion verification.** By default, before paying any browser/ffmpeg cost,
capture verifies the sampled poses for part interference at every keyframe time
plus each segment midpoint (`--verify-every <n>` additionally samples every
n-th frame time of the fps schedule). `verified: true` means verification ran
AND every sampled pose was collision-free using the mechanism-validity interference rule (overlap > 0.01 mm³ and thicker than 0.01 mm; thinner is face contact)
(touching ≠ interference; declared `solvedModel({ ignore })` pairs are
honored). Each collision is a `{ tMs, a, b, volumeMm3 }` row with an
`animation.collision` diagnostic naming the pair and time. `--no-verify` skips
the gate and sets `verified: false` (`verify_skipped` on the MCP envelope) — do
not ship a mechanism animation with `--no-verify` standing in for a clean pass.

**Studio Animation tab (live review).** The same `animationView` timeline plays
live in Studio's Inspector Animation tab — scrub or play it (with loop /
reciprocate modes and a speed control). The timeline is baked once (every frame
solved server-side into per-part transforms), then interpolated and played
client-side at full rate, so playback is smooth; on pause the kernel pose is
synced to the displayed frame so Export/Validate agree with the viewport. Live
drive needs a server-pool session (the model opened via `?script=`); the
editor-only mode previews sampled values. Offline `kernelcad animate` remains
the full-fidelity, verified MP4 capture.
