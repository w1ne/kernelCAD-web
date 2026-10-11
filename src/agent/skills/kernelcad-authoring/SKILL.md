---
name: kernelcad-authoring
description: kernelCAD model authoring API — primitives, transforms, booleans, sketches, path-builder, sketch-text, return-single-shape rule, conventions, CLI commands, and verification gates. Load this when writing or modifying .kcad.ts geometry.
---

# kernelCAD — authoring

Author or modify kernelCAD models in TypeScript. Scripts live in `.kcad.ts` files; the kernelCAD CLI (`kernelcad evaluate <file>` and `kernelcad export stl|step|dxf|3mf|glb <file> -o <out>`) runs them.

`.kcad.ts` scripts are single files: top-level `import`/`require` is refused with `feature.invalid-args` — define helpers in the same file.

This file is the core: units, the rules that prevent most failures, which API serves which intent, and the finish checklist. The full reference (every signature, CLI flag, material, recipe) lives in `references/*.md` beside this file; over MCP pull it with `lookup_authoring_skill({ section: '<id>' })` or `{ query: '...' }` (index at the end).

## Coordinate System

- **Z-up**, right-handed. Lengths in millimetres, angles in degrees.
- `box(x, y, z)`: corner-anchored at the origin (spans `[0, x] × [0, y] × [0, z]`). `box(x, y, z, true)` centres ALL three axes.
- `cylinder(h, r)`: axis along Z, centred in X/Y, base at `z = 0`, top at `z = h` (no centred flag).
- `sphere(r)`: centred on the origin.
- `path()...close()` builds a Sketch in XY; `.extrude(d)` goes +Z; `.revolve()` turns the (radial X, axial Z) profile about Z.
- **Return rule**: the script `return`s ONE `Shape`, or one assembly via `assembly(...).model()` / `.solvedModel()`. Only the returned value is exported, probed and measured. A script with no `return` still evaluates on the last CREATED shape (often a cutter or helper) and gets the warning `script.no-return` — treat it as a bug and add the `return`.

## Conventions

The rules that prevent most failed evaluations (from the diagnostics catalogue and repair telemetry). Fix the cause, not the symptom.

1. **ParamRef arithmetic uses methods.** `param('w', 60) + 4` throws `feature.invalid-args`; write `w.add(4)`, `w.subtract(t)`, `w.multiply(2)`, `w.divide(4)`, `w.negate()`. Declare params at the top with units; every numeric argument must be finite (`NaN`/`undefined` fails capture).
2. **Holes are features, not cylinders.** Use `hole` / `holes` / `cutout` instead of `subtract(cylinder(...))`: they drill the right size (threads, counterbores, countersinks), name their faces (`'wall'`, `'floor'`, `'counterbore-*'`, `'countersink-cone'`) and reach drawings, BOM and DFM. Hole `u`/`v` are mm offsets from the CENTRE of the entry face (`top`/`bottom`: u=+X, v=+Y; `front`/`back`: u=+X, v=+Z; `left`/`right`: u=+Y, v=+Z), not world coordinates.
3. **Booleans need real overlap.** Give unions ≥ 0.1 mm of overlap and cut tools ≥ 0.1 mm of run-out past the faces; never rely on coincident or tangent faces. A cut that misses the body is `feature.subtractive-noop` — check the tool's position and axis.
4. **One union, one connected body.** `union.disconnected` = an operand floats; move it until it touches. `union.member-overlap` = two separately finished pieces of the same stock overlap; fuse first and `.finish()` once, or butt the members (`span - 2 * railWidth`).
5. **Separate components are named parts.** Every physically distinct component is `assembly().part(name, shape)`; parts that touch or move get connectors and a mate (`'fastened'`, `'revolute'`, `'prismatic'`, `'cylindrical'`, `'planar'`, ...) with limits — not raw `translate()` offsets. Loose top-level bodies emit `assembly.structure.unstructured-bodies`.
6. **Sketches are one closed loop.** Close the path, drop zero-length segments and duplicate points; a revolve profile stays at `x ≥ 0` (`feature.revolve.crosses-axis`).
7. **Fillets and chamfers fit the wall.** Keep the radius below half the local wall thickness, and every target edge at least 2 × radius long (`feature.edge-feature.short-edges-skipped`) — round a plate's corners in its outline (`extrudeRoundedRect`) rather than filleting short vertical edges (`repair-oversized-fillet`); fillet/chamfer/shell BEFORE the boolean that splits the face (`feature.face-ref.ambiguous-after-split`) and before transforms when you address faces by name.
8. **Face names exist only where a primitive defines them.** Box: all six (`top`, `bottom`, `left`, `right`, `front`, `back`); cylinder: `top`/`bottom` only; sphere, extruded sketches, `extrudeRoundedRect`, revolves and lofts: none (`feature.face-ref.not-applicable`). Pick those faces, and faces a cavity cut duplicated, by query: `{ byNormal: 'Z' }`, `{ byNormal: '-Z', atZ: 0 }` (axis strings `'X'`, `'-X'`, `'Y'`, `'-Y'`, `'Z'`, `'-Z'`).
9. **Await async helpers.** `selectEdges`, `lib.fromSTEP`, `lib.fetchPart`, `.boundingBox()`, `.recenter()` and `.seatOnFloor()` return promises (`feature.async-result.missing-await`).
10. **Read the diagnostic, then repair one cause.** Every diagnostic carries a `hint`; follow it. `recompute.input.missing` means an upstream feature failed — call `why_did_this_fail`. Never export or hand over a script whose last evaluate failed.
11. **Do not declare something impossible** without calling `lookup_api` and `lookup_cookbook` first. kernelCAD does NURBS lofts, sweeps, boundary patches and G2 blends; it is not a polygon sculptor or a photoreal renderer.
12. **Helical geometry**: rail from `helix(...)`, sweep with `spine: 'helix'` (threads, worms) or `spine: 'smooth'` (wire springs). Internal threads are `hole({ thread })`, never a sweep. `.mirror(plane)` = source + reflection; `.reflect(plane)` = reflection only.

## Manufacturing intent → API

Intent words → call this API; do not hand-build it (subtracted cylinders, typed involute or polygon points, unioned plates). Recipe: `lookup_cookbook(<id>)`.

| Intent words | API | Cookbook id |
|---|---|---|
| bolt hole, clearance hole, M3–M8 | `body.holes(face, { positions: [{ u, v }], diameter, depth: 'through' })`; ISO 273 clearance M3 3.4 · M4 4.5 · M5 5.5 · M6 6.6 · M8 9 | clearance-hole-through-plate |
| thread, tapped, tap drill, M-size into the part | `body.hole(face, { diameter: <nominal>, depth, thread: { pitch } })` — drills the ISO minor Ø (d − 1.0825·P); coarse P: M3 0.5 · M4 0.7 · M5 0.8 · M6 1 · M8 1.25 | threaded-hole-tap-drill |
| counterbore, socket head flush | `body.hole(face, { diameter, depth, counterbore: { diameter, depth } })` (M3 Ø6.5×3.4, M4 Ø8×4.4, M5 Ø10×5.4, M6 Ø11×6.4) | drawing-hole-and-gdt-callouts |
| countersink, flat head flush | `body.hole(face, { diameter, depth, countersink: { diameter, angleDeg: 90 } })` | countersunk-flat-head-screw |
| heat-set insert | blind `hole` at the insert pilot Ø | heat-set-insert-pilot |
| nut trap, captive nut | `hole` + `cutout(hexPath, { face, depth })` | hex-nut-trap-bolt-clearance |
| set screw, radial hole, cross hole | `hole({ ofSurfaceType: 'CYLINDER' }, { at: { angleDeg, z }, diameter, depth: 'through', thread })` straight into the round side (`'through'` stops at the bore; `at: [x, y, z]` + optional `axis` for any face / angle); a spot-face flat first is optional | threaded-hole-tap-drill |
| hole pattern, bolt circle, grid of holes | one `body.holes(face, { positions })` with computed positions; `patternLinear` / `patternGrid` / `patternCircular` for repeated bodies | clearance-hole-through-plate |
| slot, D-cut, keyhole, irregular opening | `cutout(path()...close(), { face, depth })` — the profile must stay inside the entry face; a channel open at both ends is a `subtract` with run-out | hex-nut-trap-bolt-clearance |
| pocket, recess | blind `cutout` or blind `hole` (`depth: n`) | blind-pocket-from-top |
| enclosure, box, case, hollow, wall thickness | `.shell(wall, { face: 'top' })` on the outer body, or subtract the inner box; lid = second part | enclosure-lid-with-screw-bosses |
| standoffs, bosses, PCB / Raspberry Pi mount | union `cylinder` bosses on the floor, then `holes(..., { thread })` or insert pilots through them | enclosure-lid-with-screw-bosses |
| gear, involute, module, pinion | `spurGear({ module, teeth, faceWidth, bore, backlash })`, `ringGear`; centre distance m(z1+z2)/2 | involute-spur-gear-pair |
| sheet metal, bend, flange, flat pattern | `sheetMetal(profile, { thickness, kFactor }).bend({ atX }, angle, radius)` — lines in blank coordinates, the shorter side folds, chain bends for U / Z; drill the blank before bending; MCP `flatten_pattern` | sheet-metal-l-bracket-bend |
| fit, clearance, tolerance, printer | clearance param (per side: press 0.05 · snap 0.15 · slip 0.2 · running 0.3) + `dfmSpec({ process: 'fdm', printer, minClearance })` | fdm-fit-clearance-by-fit-type |
| hinge, pivot, rotating joint | two `assembly().part`s, axis `connector`s, `mate(name, a, b, 'revolute', { limitsDeg })` | clamshell-hinge-two-part-assembly |
| shaft in bearing, slider | `'cylindrical'` / `'prismatic'` mate between connectors | shaft-and-bearing-cylindrical-mate |
| rounded edges, chamfered edges | `.fillet(r, selector)` / `.chamfer(d, selector)` after the booleans that make the edges | fillet-face-after-subtract |
| knob, pulley, turned part | `path()` half-profile `.revolve()` | revolve-rectangular-profile |
| L-bracket from plates | plates that touch without overlap, one union | non-overlapping-l-bracket |
| motor mount, NEMA 17 | `holes` on the 31 mm pattern + pilot bore | nema-motor-mounting-plate |
| photo, trace, reference image | MCP `trace_from_image` (`referenceImage` only overlays) | resolve-photo-trace-assumptions |
| infill, weak spots, stronger, will it hold, stress | `feaStudy` + `export` 3mf `infill: { fromFea }` (local ccx + gmsh) | stress-graded-infill-fdm |
| screw, nut, bearing, motor, servo | `lib.standard.*`, `lib.findPart`, MCP `find_part` | kernelcad-parts |

## Before you finish

A clean evaluate proves the script ran, not that it is the part the user asked for. A solid block is valid geometry and still fails the design. Before you report done:

1. **Re-read the request and list every must-have** — each hole, opening, cavity, wall, rib, part, clearance and joint — and point to the source line that builds it. Anything without a line is missing.
2. **Measure, do not trust your summary.** `inspect({ of: 'shape' })` (bbox, volume) must match the stated outer dimensions; volume far below the bbox volume for hollow parts, near it only for genuinely solid ones.
3. **Holes**: count, diameter, position, through vs blind as asked; threads made with `thread`, counterbores and countersinks with their options.
4. **Walls**: hollow parts are hollow with the stated wall (`inspect({ of: 'section' })` or a section render); printed parts declare `dfmSpec({ minWall })`.
5. **Parts and motion**: separate components are separate named parts; joints carry mates with limits; `kernelcad interference` is clean and nothing floats.
6. **Manufacturing method**: printed → clearances + `dfmSpec`; sheet metal → `sheetMetal()` + flat pattern; bought parts → catalog or STEP, or labelled placeholders.
7. **Look**: render top, front and iso (`render_preview` / `kernelcad render`) and check that openings, text and holes are where the request put them.
8. **Deliver**: the last `evaluate` is clean and the requested exports (STEP, STL, 3MF) were produced from it.

## Workflow

1. **Classify** the job (blockout, production part, reference replication, assembly/mechanism, sheet metal, standard-part integration) and load the matching skill.
2. **Brief**: purpose, outer dimensions, interfaces, moving parts, manufacturing method. If load-bearing dimensions are missing, ask 1–3 questions or encode each assumption as a named `param()`.
3. **Route** each feature through the table above; `lookup_cookbook` the recipe.
4. **Write** the `.kcad.ts`, evaluate, repair one diagnostic at a time.
5. **Verify** with measurements and renders, then run **Before you finish**.

Full loop, inner render loop, mechanism loop and artifact policy: section `agent-authoring-loop` (`references/workflow.md`).

<!-- OUT-OF-SCOPE:START -->
## Out of Scope

These are not available today; do not generate code that uses them. Anything not listed here is fair game — call `lookup_api` / `lookup_cookbook` before concluding kernelCAD lacks a capability.

- Asymmetric chamfer (only symmetric 45° supported) — deferred
- Param-bound (auto-updating) dimensions on `svg-drawing` — deferred; dimensions DO ship derived from the geometry (`options.autoAnnotate`: datums, hole callouts with position tolerances, positions, radii, chamfers, flatness, ISO 2768 note), authored (`options.annotations`), and as section views on any plane (`options.sections`)
- NURBS surface extend/untrim/blend, lattice/quilt — deferred (surface-surface intersection ships as `surfaceIntersection`)
- Tracked face/edge refs (only canonical refs and inline queries work) — deferred

<!-- OUT-OF-SCOPE:END -->

## Reference index

Read the file, or pull a section id with `lookup_authoring_skill({ section: '<id>' })`.

| File | Section ids | Read it when |
|---|---|---|
| `references/workflow.md` | `agent-authoring-loop`, `inner-loop-render-after-every-visible-change`, `assembly-and-mechanism-loop`, `source-and-artifact-policy`, `standard-parts-and-vendor-geometry`, `installation` | multi-part or mechanism work, renders, vendor STEP |
| `references/api.md` | `api-surface` (`top-level-functions`, `selector-algebra-shapelist`, `shape-methods-chainable`, `sketch-methods`, `pathbuilder-methods`, `2d-text-sketch-text`, `constrained-sketches-v0-4-mcp`), `labels-naming-faces-at-creation-time` | you need an exact signature |
| `references/verification.md` | `when-something-fails`, `verification-gates`, `dfm-gates-print-readiness` | a diagnostic you do not understand; print gates |
| `references/cli.md` | `cli-commands`, `animation-timelines-animationview` | CLI flags, renders, animation capture |
| `references/recipes.md` | `interlocking-joinery-flat-pack-laser-cnc`, `hardware-belts-and-wood-joinery`, `sample` | joinery, belts, worked examples |
| `references/materials.md` | `materials`, `reference-images` | finishes, colours, PBR, image overlays |
| `references/cookbook-index.md` | `cookbook-snippet-index` | every cookbook id and its trigger |

## Related skills

- `kernelcad-features` — load when adding fillets, chamfers, shells, holes, or cutouts.
- `kernelcad-params` — load when the model needs editable `param()` / `params()` values or live slider support.
- `kernelcad-assemblies` — load for multi-part models with joints, mates, or connectors.
- `kernelcad-sheet-metal` — load for bent parts and flat patterns.
- `kernelcad-nurbs` — load for freeform NURBS surfaces that primitives and sketches cannot express.
- `kernelcad-from-reference` — load when building from a reference photo or visual brief; extends the verification gate set.
- `kernelcad-mcp` — load instead of this skill when you need to introspect a running model dynamically via MCP tools.
