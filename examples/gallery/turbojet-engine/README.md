# kernelCAD v0.17 hero — single-spool turbojet (display model)

`examples/gallery/turbojet-engine.kcad.ts` is an exhibit-grade cutaway of a
J85-class single-spool turbojet: inlet guide vanes, an 8-stage axial
compressor with stator rings, a can-annular combustor, a 2-stage turbine with
NGVs, and a convergent nozzle. It is a **display build**, not a build drawing:
all dimensions are display approximations of a J85-class spool and every
simplification is listed below. It is also the artifact that motivated the
kernel fixes shipped in v0.17 (see the gap log).

Units: mm and degrees. Z-up; the engine axis runs along +Z (inlet at −z,
exhaust at +z). World transforms are authored directly, so the zero pose is
the shipped pose.

## How to run

```bash
# Fast checks
node dist/cli/index.js evaluate examples/gallery/turbojet-engine.kcad.ts
node dist/cli/index.js validate examples/gallery/turbojet-engine.kcad.ts
node dist/cli/index.js interference examples/gallery/turbojet-engine.kcad.ts --epsilon 20

# Renders (need a studio dev server on 127.0.0.1:5173: `npm run dev`)
node dist/cli/index.js render examples/gallery/turbojet-engine.kcad.ts -o hero.png --no-watermark
node dist/cli/index.js render examples/gallery/turbojet-engine.kcad.ts --hide casing-upper-half -o cutaway.png --no-watermark
node dist/cli/index.js render examples/gallery/turbojet-engine.kcad.ts --section x=0 -o section.png --no-watermark

# Exports (8 GB heap: the default 2 GB OOMs)
NODE_OPTIONS=--max-old-space-size=8192 node dist/cli/index.js parts examples/gallery/turbojet-engine.kcad.ts --json
NODE_OPTIONS=--max-old-space-size=8192 node dist/cli/index.js export step examples/gallery/turbojet-engine.kcad.ts -o turbojet.step
NODE_OPTIONS=--max-old-space-size=8192 node dist/cli/index.js export stl  examples/gallery/turbojet-engine.kcad.ts -o turbojet.stl
NODE_OPTIONS=--max-old-space-size=8192 node dist/cli/index.js export glb  examples/gallery/turbojet-engine.kcad.ts -o turbojet.glb
```

The `inspect`, `cutaway`, `section` renders in this directory are the visual
evidence for the v0.17 release notes.

## Envelope and scale

| Quantity | Value |
|---|---|
| Declared `engineLength` (param) | 1200 mm, inlet lip (−560) to nozzle exit (640) |
| Declared `maxDiameter` (param) | 460 mm, casing flange faces (r230) |
| Spinner tip | z −612 (52 mm forward of the inlet lip, as on a real spool) |
| Mount trunnions | y ±277 (beyond the flange envelope, as on a real engine) |
| Casing barrel | bore r211, outer r222, wall taper to r213 at the inlet lip |
| Part count | **42** (mechanism budget `(1+3+3) × 42 = 294 ≤ 300`) |
| Joints | one `revolute` (spool, axis +Z, ±180°), 41 `fastened` mates |

## Stage table (locked with Task 7 evidence)

| Stage | z | hubR | rimR | rootChord | tipChord | thickness | stagger root→tip |
|---|---|---|---|---|---|---|---|
| IGV | −520 | 210 | 150 | 42 | 42 | 0.10 | 38→38 |
| R1 | −470 | 65 | 150 | 52 | 46 | 0.11 | 34→42 |
| R2 | −400 | 70 | 152 | 50 | 44 | 0.10 | 30→40 |
| R3 | −330 | 75 | 155 | 48 | 42 | 0.10 | 28→38 |
| R4 | −260 | 80 | 158 | 46 | 40 | 0.10 | 26→36 |
| R5 | −190 | 85 | 160 | 44 | 38 | 0.10 | 24→34 |
| R6 | −120 | 90 | 162 | 42 | 36 | 0.10 | 22→32 |
| R7 | −50 | 95 | 164 | 40 | 34 | 0.10 | 20→30 |
| R8 | 20 | 100 | 166 | 38 | 32 | 0.10 | 18→28 |
| stator 1–7 | −435…−15 | ring band 205–218 | — | 30…27 | 19…17 | 0.10 | 26 |
| NGV1 | 250 | 170 | 205 | 55 | 55 | 0.11 | 30→30 |
| T1 | 303 | 110 | 168 | 60 | 52 | 0.12 | 26→44 |
| NGV2 | 358 | 172 | 208 | 58 | 58 | 0.11 | 28→28 |
| T2 | 415 | 110 | 170 | 64 | 56 | 0.12 | 24→42 |

All bladed rows use **10 blades**; blade roots embed **2 mm** into their mount
(`rootR = rimR − 2` for rotors, `mountSurfaceR + 2` for casing/band-rooted
vanes). Rotor tips stop at r205, leaving 6 mm to the r211 casing bore.

## Display simplifications (measured)

1. **10 blades per row** (12 max for at most 2 hero rows, never 14+). Measured
   with the shipped cambered section: 10 blades → 26.1 s STL, 14 → 44 s
   (≈4.5 s/blade). Twenty rows at 10 → ≈8.7 min + discs ≈ 9.7 min, inside the
   <10 min budget; 14 would take ≈15 min. Blade counts are a display choice.
2. **Cambered n=10 two-spline section**, not a single closed spline: 17,110 vs
   167,368 export triangles per blade (9.8×) and ≈20-25× faster meshing.
3. **Static by default.** `spoolDeg` is a `param('spoolDeg', 0, ±180)` consumed
   by the solved pose; the shipped default is the static exhibit pose.
4. **Hand-modeled bearings**, not vendor parts: annular housings with 1 mm
   radial play on Ø60 shaft lands. Catalog bearings are a future improvement.
5. **No spacer drum**: the Ø44 main journal passes the r65–r100 disc bores
   with 43–78 mm radial clearance (a display simplification over a real spool).
6. **Three merges to fit the 42-part budget**: each casing half includes its
   half of the convergent nozzle (both casing color); the exhaust cone is
   merged into the rear bearing housing (both dark steel); each stator band and
   its vane row is one part so the vane color survives.
7. **No inlet ring part**: the casing inlet lip itself is the inlet ring.

## Intended contacts (38 pairs, silenced in `solvedModel({ ignore })`)

The clash gate treats every shared volume above 20 mm³ as an error; these
contacts are design intent and are listed here with their reason:

| Pair(s) | Count | Reason |
|---|---|---|
| casing-lower/upper-half × 8 stator units + NGV-1/2 | 20 | band rims embed 7 mm into the r211 casing bore |
| casing-lower/upper-half × bearing-front/rear | 4 | bearing rims embed 3 mm into the casing bore |
| casing-upper-half × mount-front, casing-lower-half × mount-rear | 2 | mount plates embed 5 mm into the barrel |
| compressor-disc-i × compressor-blades-i | 8 | blade roots embed 2 mm into the disc rim |
| turbine-disc-1/2 × turbine-blade-1/2 | 2 | blade roots embed 2 mm into the disc rim |
| shaft × nose-cone | 1 | spinner base swallows the shaft nose |
| combustor-cans × fuel-manifold | 1 | injector lines bury 5 mm into the can snouts |

`interference --epsilon 20` (with these pairs `--ignore`d) reports
**0 interfering pairs across 99 bbox-pruned comparisons**.

## Measured evidence (v0.17 release)

| Gate | Result |
|---|---|
| `evaluate` (final assembly) | 276 features, `OK`, **587 s** (passes at 237–393 s on a lighter machine load) |
| `validate` | clean, 42 parts (mate-vocabulary assemblies report 0 joints — see gap log) |
| `interference --epsilon 20` | 0 pairs / 99 comparisons |
| `parts --json` (8 GB heap) | 42 parts, **2,916,402 triangles** total; largest: compressor-blades-8 171,564 |
| `export step` | 11.2 MB, 173 s |
| `export stl` (watertight verify on) | 78.4 MB, 3625 s, peak RSS 6.3 GB |
| `export glb` | 66.0 MB, 333 s |
| Hero render (4 views) | 511 s; cutaway 477 s; section ≈6 min |
| Kernel regression sweep | 62 files / 514 tests pass (`--no-file-parallelism`) |

### Demo (v0.17 release)

`docs/demos/v0.17/turbojet/` ships `demo.mp4` (1920×1080, 10 fps, 29.7 s),
`panel.png` (prompt + source + harness score PASS 1.00 + hero frame),
`hero-frame.png`, `pacing.json`, `whats-new.md` and `meta.json` (override
recorded; validator-clean). The demo is the **cutaway**: the capture hides
`casing-upper-half` (`captureDemo --hide`), looks into the open half
(`--pose 205,20`) and orbits, so the compressor rows and the bronze hot
section read against the retained casing.

Capture tooling added for this artifact: `captureDemo
--fps/--width/--height/--hide/--pose`, and the demo player's
`CameraController.cancelNudge()` (called by `setRenderView`/`setRenderPose`/
`startRotate`) so an explicit camera fit is not overridden by a build-phase
nudge tween on the next `advance()`. Two earlier capture attempts failed under
machine load (hero-screenshot protocol error; ~2 frames/min); the successful
runs used the reduced settings. Note `scripts/lint-demos.ts` checks media only
for tagged modules, so v0.17 is enforced at tag time.

### Post-merge status (2026-09-20)

The branch was merged with `origin/develop` (477 commits: the `lowerers/`
dispatch refactor and the sketch/occtBackend splits). The v0.17 twist features
were ported onto the new architecture (`lowerers/loft.ts`,
`lowerers/sketchExtrude.ts`) and re-verified: tsc clean, twist suites green,
turbojet evaluate 276 features `OK`, skill/drift suites green, dist rebuilt.
The previously deferred kernel gaps in this log were then closed on the merged
tree: **#5** variableSweep intermediate stations (spine subdivision; t is the
normalized curve parameter), **#6** spline-only revolve profiles, **#17**
loft null tolerance, **#18** `twistAngle` on rect/circle/polygon/rounded-rect
extrudes, **#19** rail-loft NURBS section `origin`, **#22** non-finite
rotation guard. Remaining deferred entries are environmental/scale limits
(render-inspect, validate-interference, heap, local imports, tsconfig
coverage, jointCount display, lighting, spline pen contract). The demo capture
is complete (cutaway, see the Demo section above).

## Gap log

Every kernel/model friction found while building this artifact, with
reproduction and disposition. "Fixed" means the v0.17 diff on this branch.

| # | Gap | Repro | Root cause | Disposition |
|---|---|---|---|---|
| 1 | Loft `planes[].rotationDeg` silently ignored | twist sections, `evaluate` → unrotated solid | capture accepted the key, lowerer never applied it | **Fixed** (Tasks 1-3): capture + lowerer + `rotateSketchCommands` |
| 2 | NURBS loft sections dropped `planes[].origin` | NURBS section on a translated plane → `feature.empty-result` | lowerer placed every NURBS section at the world origin | **Fixed** (Task 3) |
| 3 | `extrude({ twistAngle })` silently ignored | rect extrude with twist → straight prism | option parsed, never lowered | **Fixed** (Task 4): real twist + typed guards |
| 4 | Skill docs advertised `{ normal, origin }` for loft planes | read `kernelcad-nurbs` SKILL.md pre-v0.17 | docs drifted from the shipped API | **Fixed** (Task 5): docs + `listApi` + cheat sheet |
| 5 | `variableSweep` >2 stations unsupported | `variableSweep` with 3 stations → error | only t=0/t=1 are lowered | **Fixed** (post-v0.17 working tree): the lowerer subdivides the spine at each intermediate station (`BRep_Tool.Curve_2` → `BRepBuilderAPI_MakeEdge_29` sub-edges with shared vertices → `BRepBuilderAPI_MakeWire`), then anchors the profile at the matched station vertex; a 3-station sweep builds. Coverage: `tests/unit/backends/occt/variableSweepLowerer.test.ts` (3/4-station bbox + validation) and `tests/integration/variableSweepEndToEnd.test.ts` (engine path) |
| 6 | `revolve` rejects spline-only profiles | revolve a closed `spline`-only path → `feature.invalid-args` "no line/arc segments" | revolve lowerer counted only lineTo/tangentArc segments | **Fixed** (post-v0.17 working tree): all segment kinds accepted; axis check covers spline/NURBS/hermite points; tests in `tests/unit/backends/occt/revolveSplineProfile.test.ts` |
| 7 | `.kcad.ts` scripts cannot import local TS modules | `import { K } from './lib.ts'` in a script → `ReferenceError: K is not defined` | imports are stripped before execution | **Deferred**: scratch/test reuse requires inline copies; caused duplicate helper code in `/tmp` probes |
| 8 | No tsconfig project covers `examples/**/*.kcad.ts` | `tsc --noEmit -p tsconfig.app.json --listFilesOnly` shows 0 example files | examples are outside every project | **Deferred**: examples get eslint + runtime only |
| 9 | `render inspect` impractical at 42 parts | `render inspect … --channels rgb,mask,depth,normals` ran >90 min, wrote no manifest; RGB-only >60 min | per-part/per-channel frame explosion | **Deferred**: use plain multi-view renders + `--hide`/`--section` |
| 10 | `validate --include-interference` impractical at 42 parts | ran >30 min with no output | exact BREP pair probing without bbox pruning in that path | **Deferred**: use the dedicated `interference` command (99 bbox-pruned comparisons, seconds of probing after evaluate) |
| 11 | `parts`/STL/GLB OOM at the default heap | `parts --json` aborts (SIGABRT) at ~2 GB | meshing the full assembly exceeds 2 GB | **Documented**: run exports with `NODE_OPTIONS=--max-old-space-size=8192` (STL peaks 6.3 GB) |
| 12 | `validate` reports 0 joints for mate-vocabulary assemblies | `validate` on any `engine.mate()` assembly | `jointCount` counts v0.5 `assemblyJoint` records only (`src/modeling/mates/validator.ts:337-358`) | **Deferred** (display): connectivity is still validated via the mate graph; verified with a pose probe (spin 90° moves the rotor) |
| 13 | Hot-section rows interfered at intermediate spool phases | phase sweep at the Task 8 z stations (250/300/340/380): ngv1↔t1 1.148 mm (26°), ngv2↔t2 0.000 mm interfering (28–32°) | rotating a blade between two vanes closes the tangential gap; chords ≈ z pitch | **Fixed in model** (Task 11): axial separation `z_B − z_A ≥ halfA + halfB + 1.5`, `half=(chord/2)cos(stagger)` → stations 250/303/358/415, measured 2.220/2.431/2.161 mm phase-invariant; compressor interfaces min 4.558 mm |
| 14 | `--environment studio` render exits 1 | `render … --environment studio` after ~11 min → exit 1 | preset unavailable/failed in this environment | **Deferred**: default three-light rig is used for the shipped renders |
| 15 | Exterior render reads dark | full-engine RGB render with casing `#565d67`, later `#7b838d` | curved surfaces fall in shade under the default rig | **Style note**: use the cutaway/section for hero reads; beauty lighting is a future pass |
| 16 | `path().spline` requires the first point to exactly repeat the pen position | spinner ogive spline without a duplicated tip point → `feature.path.spline.degenerate-points` | spline chaining contract | **Documented** (Task 10): duplicate the tip point; ergonomics minor |
| 17 | `Sketch.loft` crashes on `opts = null` while `Sketch.extrude` tolerates it | `loft(others, null)` | inconsistent null handling | **Fixed** (pre-commit review): capture does `opts ??= {}` like extrude; regression test in `tests/unit/capture/loftTwistOptions.test.ts` |
| 18 | `twistAngle` on rect/circle/polygon extrude records is ignored | extrude those profiles with `twistAngle` | only the spline/profile path lowers twist | **Fixed** (post-v0.17 working tree): all four primitive builders accept and lower `twistAngle` with the same typed guards as `Sketch.extrude` (capture stores a `'deg'` param, backend twists about the profile origin, 0 keeps the legacy call). Coverage: `tests/unit/capture/extrudeTwistCapture.test.ts` (capture: default 0, ParamRef, unknown-key/non-finite rejection, all four kinds) and `tests/unit/backends/occt/extrudeTwist.test.ts` (backend + lowerer: 0 equals legacy, twist grows the bbox, non-finite → `feature.invalid-args`) |
| 19 | Rail-guided lofts reject `rotationDeg` and ignore `planes[].origin` for NURBS sections | rail loft with rotation → lowering error | rail branch has no rotated-section support | **Rotation still rejected by design** (loud `feature.invalid-args`, rails follow the rails); **`origin` now applied to NURBS sections** (post-v0.17 working tree), regression test in `tests/unit/capture/loftWithRails.test.ts` |
| 20 | Duplicate allowed-keys guard loops (loft vs extrude) | read `src/modeling/capture/sketch.ts` | two hand-rolled guards grew independently | **Deferred** (cosmetic) |
| 21 | One kernel test flaked under parallel load | first `vitest run` (parallel) failed 1/513; `--no-file-parallelism` clean | known load-sensitive capture suite | **Workaround documented**: run the sweep serialized |
| 22 | `buildNurbsSketchOnPlane` silently ignored non-finite `rotationDeg` | NURBS section with `rotationDeg: NaN` → section placed unrotated | truthiness check skipped `NaN` and fed non-finite values into `rotateSketchCommands` | **Fixed** (pre-commit review): now throws; test in `tests/unit/backends/occt/loftSectionRotation.test.ts` |
