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

# Typecheck the model scripts (wrapper typechecker — gap #8)
npm run typecheck:examples        # gates the v0.17 files
npm run typecheck:examples:all    # full examples tree; legacy backlog is non-zero (gap #8)

# Renders (need a studio dev server on 127.0.0.1:5173: `npm run dev`)
node dist/cli/index.js render examples/gallery/turbojet-engine.kcad.ts -o hero.png --no-watermark
node dist/cli/index.js render examples/gallery/turbojet-engine.kcad.ts --hide casing-upper-half -o cutaway.png --no-watermark
node dist/cli/index.js render examples/gallery/turbojet-engine.kcad.ts --section x=0 -o section.png --no-watermark

# Exports (mesh-heavy commands re-exec with an 8 GB heap automatically when
# the default heap is too small; no NODE_OPTIONS needed — gap #11)
node dist/cli/index.js parts examples/gallery/turbojet-engine.kcad.ts --json
node dist/cli/index.js export step examples/gallery/turbojet-engine.kcad.ts -o turbojet.step
node dist/cli/index.js export stl  examples/gallery/turbojet-engine.kcad.ts -o turbojet.stl
node dist/cli/index.js export glb  examples/gallery/turbojet-engine.kcad.ts -o turbojet.glb
```

The `inspect`, `cutaway`, `section` renders in this directory are the visual
evidence for the v0.17 release notes, but they predate the mechanism fix
(shaft drum + combustor chain) and need a re-capture — see the post-merge
status below.

## Envelope and scale

| Quantity | Value |
|---|---|
| Declared `engineLength` (param) | 1200 mm, inlet lip (−560) to nozzle exit (640) |
| Declared `maxDiameter` (param) | 460 mm, casing flange faces (r230) |
| Spinner tip | z −612 (52 mm forward of the inlet lip, as on a real spool) |
| Mount trunnions | y ±277 (beyond the flange envelope, as on a real engine) |
| Casing barrel | bore r211, outer r222, wall taper to r213 at the inlet lip |
| Part count | **42** (mechanism budget `(1+3+3) × 42 = 294 ≤ 300`) |
| Joints | one `revolute` (spool, axis +Z, ±180°), 40 `fastened` mates (41 joints) |

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
5. **Stepped display drum, line-to-line fit**: every rotor disc bore
   (compressor r65–r100, turbine r110) rides a shaft collar that spans the
   18 mm web with 2 mm margin each side, so the spool has material contact
   instead of the journal passing the discs in open air. The collars are
   sized line-to-line with the bores: a literal 2 mm radial shrink fit would
   share ≈15,000–25,000 mm³ with each disc and add ten pairs over the 20 mm³
   clash cap, so the display fit is zero-clearance / zero-shared-volume
   (gap #23).
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

The mechanism fix added line-to-line contacts (drum collars ↔ disc bores,
combustor chain ↔ casing barrel). They share zero volume, so the ignore list
stays at 38 pairs and the raw detector still sees them (gap #23).

`interference --epsilon 20` (with these pairs `--ignore`d) reports
**0 interfering pairs across 99 bbox-pruned comparisons**.

## Measured evidence (v0.17 release)

| Gate | Result |
|---|---|
| `evaluate` (final assembly) | 276 features, `OK`, **587 s** (passes at 237–393 s on a lighter machine load; 198 s after the mechanism fix) |
| `validate` | clean, 42 parts, 41 joints, 0 diagnostics (gap #12) |
| `validate --include-interference --no-include-physics` | mechanism **real**, 0 `mechanism.joint-mesh-gap` failures, 0 interference pairs, 0 diagnostics (gap #23) |
| `interference --epsilon 20` (38 intended contacts ignored) | 0 pairs / 99 comparisons |
| `parts --json` (CLI auto-bumps to 8 GB heap) | 42 parts, **2,916,402 triangles** total; largest: compressor-blades-8 171,564 |
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
rotation guard. The two scale limits (**#9** render-inspect, **#10**
validate-interference) were then made tractable on the merged tree: the
`validate` interference path now lowers once, honors the model's `ignore`
list, and re-poses one lowered scene across the mechanism sweep; `render
inspect` gained `--views` batching and a capped mask render. Remaining
deferred entries are local imports, the legacy-example typecheck backlog
behind gap #8, jointCount display, lighting, and the spline pen contract. The
mechanism-truth gap that remained after #10 — the display model's floating
disc/combustor mates tripping
`mechanism.joint-mesh-gap` — is closed by the stepped drum and touching
combustor chain (gap #23): `validate --include-interference
--no-include-physics` now reports mechanism `real` with 0 failures and 0
interference pairs. The demo capture is complete (cutaway, see the Demo
section above), but **the renders and the demo predate the mechanism fix and
need a re-capture** (the shaft drum and combustor chain changed the
geometry); the controller handles that refresh.

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
| 7 | `.kcad.ts` scripts cannot import local TS modules | `import { K } from './lib.ts'` in a script → `ReferenceError: K is not defined` | imports are stripped before execution | **Improved** (post-merge working tree): execution now refuses top-level `import`/`require` before the normalizer strips them and raises a structured `feature.invalid-args` diagnostic ("local imports are not supported in .kcad.ts — define helpers in the same file (imports are stripped before execution)") instead of the mid-evaluation `ReferenceError`; loud diagnostic, import support still deferred (helpers must be inlined). Coverage: `tests/unit/cli/localImportDiagnostic.test.ts` |
| 8 | No tsconfig project covers `examples/**/*.kcad.ts` | `tsc --noEmit -p tsconfig.app.json --listFilesOnly` shows 0 example files | examples are outside every project | **Improved** (post-merge working tree): `.kcad.ts` files are function bodies, not modules, so no tsconfig `include` can check them. `scripts/typecheckExamples.ts` generates a temp wrapper per file — a preamble declaring every runtime global (`KernelCadApi` member types parsed from `src/modeling/api.ts`, the browser worker's shim-only globals as documented `any`, and the common type aliases like `Editable`/`Shape`) around the source in an async IIFE — then runs one `tsc --noEmit` over the batch. `npm run typecheck:examples` gates the v0.17 files (`turbojet-engine.kcad.ts`, `twisted-blade.kcad.ts`) at **0 errors** (fixed two real `frameConnector` literal-widening errors in the turbojet script); `npm run typecheck:examples:all` reports the broader backlog: **304 pre-existing errors in 24 of 109 legacy files**, led by `watch-from-screenshot-agent-loop-v2.kcad.ts` (75), `robot-hand/workflow-candidates-comparison.kcad.ts` (45), `pocket-watch/build.kcad.ts` (41), `pocket-watch-v2/build.kcad.ts` (36), `meta-glasses.kcad.ts` (16), `ratchet-stool.kcad.ts` (15) — mostly TS7006 untyped params (186) and stale API members such as `Assembly.fixed` (TS2339, 56); legacy files are intentionally not "fixed" by this change. Drift sentinel: `tests/unit/scripts/typecheckExamplesGlobals.test.ts` parses the worker's injected globals and fails if the wrapper stops declaring any of them |
| 9 | `render inspect` impractical at 42 parts | `render inspect … --channels rgb,mask,depth,normals` ran >90 min, wrote no manifest; RGB-only >60 min | per-view/per-channel frame explosion at full 1920×1080, plus the same mechanism-probe sweep as #10 | **Improved** (post-merge working tree): `render inspect` gained `--views <list>` (`front,right,top,iso`; default all four) so a bundle can be captured in view batches, and the mask channel renders through a capped offscreen render target (`MASK_CAPTURE_MAX_SIZE = 1024` longest edge, aspect preserved, sRGB output so `#00000n` object-id bytes survive) that the CLI nearest-upscales to the requested tile. RGB/depth/normals semantics unchanged; `captureMaskPng()` with no argument keeps the full-canvas path for Studio. Measured: `render inspect … --views iso --channels rgb,mask` → **7:16** (exit 0) and `--views iso --channels rgb,mask,depth,normals` → **7:21** (exit 0); manifest + all four `channels/<channel>/iso.png` written (rgb 99 KB, mask 14.5 KB / 242 k non-black px with exact object-id bytes, depth 427 KB, normals 92 KB; depth/normals add ≈5 s). Remaining: the mechanism-truth probe (one full model build + one sweep lower, ≈5 min after gap #10) and the 2.9 M-triangle Node meshing dominate the run; masks only show camera-visible surfaces (interior parts are occluded by the casing, as in RGB), and multi-view bundles still pay per view |
| 10 | `validate --include-interference` impractical at 42 parts | ran >30 min with no output | each BREP criterion re-lowered the whole assembly per pose sample, and criterion 1 lowered each fastened part via `Shape.lower()` — which re-runs the ENTIRE record chain — so the 42-part assembly paid ~O(parts) full lowers | **Fixed** (post-merge working tree): `detectInterferences` now exposes the AABB candidate pass (`collectInterferenceCandidates`; disjoint bboxes are never probed, symmetric `ignore` applied before the bbox test) and `validate` executes the script once, lowers once, reuses the session for the mechanism probe, and honors the model's `solvedModel({ ignore })` list symmetrically; the mechanism-truth sweep lowers one rest scene (also the source of criterion-1 bbox corners) and re-poses it per sample via `reposedLoweredAssemblyScene`. Measured: `validate … --include-interference --no-include-physics` → **5:04** (was >30 min), 42 parts / 41 joints, 0 validator diagnostics, 0 `assembly.interference.overlap` errors (all 38 intended contacts silenced by the model's `solvedModel({ ignore })` list; the dedicated `interference` command still reports them unless `--ignore` is passed), mechanism `broken` with 30 `mechanism.joint-mesh-gap` errors (closed by gap #23). Those come from the display model, not the detector: `fixed()` anchors every fastener connector at the child's local origin, which is in open space for 25 of the 41 fixed mates (model-authoring follow-up; interference/ignore semantics are unchanged). Coverage: `tests/unit/runtime/detectInterferences.test.ts` (disjoint → 0 probes, near-touching → probed, ignore honored), `mechanismTruth.test.ts` case 5b (symmetric `ignore` on a genuine overlap) |
| 11 | `parts`/STL/GLB OOM at the default heap | `parts --json` aborts (SIGABRT) at ~2 GB | meshing the full assembly exceeds 2 GB | **Fixed** (post-merge working tree): the CLI entry (`src/agent/cli/index.ts`) re-execs mesh-heavy commands (`export`, `parts`, `render`, `animate`, `inspect`, `dfm`, `interference`) once with `--max-old-space-size=8192` when the V8 heap limit is too small and no explicit `--max-old-space-size` is present in `NODE_OPTIONS`/`execArgv`; `KCAD_HEAP_REEXEC=1` guards against re-exec loops and fast commands keep the default heap. Coverage: `tests/unit/cli/heapReexec.test.ts`; evidence: turbojet `parts --json` without `NODE_OPTIONS` → 42 parts, exit 0 |
| 12 | `validate` reports 0 joints for mate-vocabulary assemblies | `validate` on any `engine.mate()` assembly | `jointCount` counts v0.5 `assemblyJoint` records only (`collectJoints` in `src/modeling/mates/validator.ts`) | **Fixed** (post-merge working tree): `collectJoints` folds v0.6 mate-graph edges from `solvedAssembly`/`assemblyModel` metadata `mates` (name + type carried) into `jointCount`, deduped by name against v0.5 `assemblyJoint` records; floating/orphan/interference diagnostics unchanged. Coverage: `tests/unit/mates/validateAssemblyMateAwareness.test.ts` (mate-count + cross-vocabulary no-double-count cases) |
| 13 | Hot-section rows interfered at intermediate spool phases | phase sweep at the Task 8 z stations (250/300/340/380): ngv1↔t1 1.148 mm (26°), ngv2↔t2 0.000 mm interfering (28–32°) | rotating a blade between two vanes closes the tangential gap; chords ≈ z pitch | **Fixed in model** (Task 11): axial separation `z_B − z_A ≥ halfA + halfB + 1.5`, `half=(chord/2)cos(stagger)` → stations 250/303/358/415, measured 2.220/2.431/2.161 mm phase-invariant; compressor interfaces min 4.558 mm |
| 14 | `--environment studio` render exits 1 | `render … --environment studio` after ~11 min → exit 1 | the CLI awaited `setRenderEnvironment` unbounded, so any HDRI load failure/timeout rejected the whole render (a 404 reproduces it) | **Fixed** (post-merge working tree): `applyRenderEnvironmentWithFallback` in `src/agent/render/headlessRender.ts` bounds the apply (30 s page budget + 10 s response slack), prints a stderr warning naming the environment and the reason, resets the scene to the default three-light rig and continues (exit 0); a timed-out apply that lands late is undone so it cannot leak into the fallback capture. Coverage: `tests/unit/render/renderEnvironmentFallback.test.ts` |
| 15 | Exterior render reads dark | full-engine RGB render with casing `#565d67`, later `#7b838d` | curved surfaces fall in shade under the default rig | **Style note**: use the cutaway/section for hero reads; beauty lighting is a future pass |
| 16 | `path().spline` requires the first point to exactly repeat the pen position | spinner ogive spline without a duplicated tip point → `feature.path.spline.degenerate-points` | spline chaining contract | **Documented** (Task 10): duplicate the tip point; ergonomics minor |
| 17 | `Sketch.loft` crashes on `opts = null` while `Sketch.extrude` tolerates it | `loft(others, null)` | inconsistent null handling | **Fixed** (pre-commit review): capture does `opts ??= {}` like extrude; regression test in `tests/unit/capture/loftTwistOptions.test.ts` |
| 18 | `twistAngle` on rect/circle/polygon extrude records is ignored | extrude those profiles with `twistAngle` | only the spline/profile path lowers twist | **Fixed** (post-v0.17 working tree): all four primitive builders accept and lower `twistAngle` with the same typed guards as `Sketch.extrude` (capture stores a `'deg'` param, backend twists about the profile origin, 0 keeps the legacy call). Coverage: `tests/unit/capture/extrudeTwistCapture.test.ts` (capture: default 0, ParamRef, unknown-key/non-finite rejection, all four kinds) and `tests/unit/backends/occt/extrudeTwist.test.ts` (backend + lowerer: 0 equals legacy, twist grows the bbox, non-finite → `feature.invalid-args`) |
| 19 | Rail-guided lofts reject `rotationDeg` and ignore `planes[].origin` for NURBS sections | rail loft with rotation → lowering error | rail branch has no rotated-section support | **Rotation still rejected by design** (loud `feature.invalid-args`, rails follow the rails); **`origin` now applied to NURBS sections** (post-v0.17 working tree), regression test in `tests/unit/capture/loftWithRails.test.ts` |
| 20 | Duplicate allowed-keys guard loops (loft vs extrude) | read `src/modeling/capture/sketch.ts` | two hand-rolled guards grew independently | **Deferred** (cosmetic) |
| 21 | One kernel test flaked under parallel load | first `vitest run` (parallel) failed 1/513; `--no-file-parallelism` clean | known load-sensitive capture suite | **Workaround documented**: run the sweep serialized |
| 22 | `buildNurbsSketchOnPlane` silently ignored non-finite `rotationDeg` | NURBS section with `rotationDeg: NaN` → section placed unrotated | truthiness check skipped `NaN` and fed non-finite values into `rotateSketchCommands` | **Fixed** (pre-commit review): now throws; test in `tests/unit/backends/occt/loftSectionRotation.test.ts` |
| 23 | `mechanism.joint-mesh-gap` on 15 fixed mates (30 rows) | `validate … --include-interference --no-include-physics` → mechanism `broken` with 30 `joint-mesh-gap` errors: `mount-front`, `combustor-outer/liner/cans/fuel-manifold`, 8 compressor discs, 2 turbine discs, 8 compressor blade rows, 2 turbine blade rows | criterion 7 requires each mate's two bodies to be material-connected within 1 mm, but the Ø44/Ø60 shaft passed the r65–r110 disc bores in open air (43–78 mm), the combustor shells were 5–23 mm inside `casing-lower-half`, and the blade rows were fastened to the shaft although they only touch their discs | **Fixed in model**: (a) stepped spool drum — a collar line-to-line with each disc bore (compressor r65–r100, turbine r110) spanning the 18 mm web + 2 mm margin each side, so the joint-mesh gap and the shared volume are both 0; (b) combustor re-wired into a touching chain (`casing-lower-half` → outer casing → liner → cans → fuel-manifold) with outer casing outer = 211 barrel bore, liner outer = 196 outer-casing bore, liner bore = 164 can outer edge; (c) `mount-front` fastened to `casing-upper-half` (the half its plate embeds in); (d) blade rows fastened to their discs (the 2 mm root embed is the real joint). A literal 2 mm drum shrink fit was rejected: it shares ≈15,000–25,000 mm³ per disc and would add ten pairs over the 20 mm³ cap, breaking the "existing 38 ignores stay 0 pairs" gate. Measured: mechanism `real`, 0 failures, 0 diagnostics; `interference --epsilon 20` with the same 38 ignores → 0 pairs / 99 comparisons; `evaluate` 276 features `OK` |
