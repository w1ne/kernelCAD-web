# v0.17 — single-spool turbojet cutaway

## Hero artifact

A J85-class single-spool turbojet cutaway, authored as one
`examples/gallery/turbojet-engine.kcad.ts` script: 8 compressor stages with
stator rings and an IGV, a can-annular combustor, 2 turbine stages with NGVs,
a convergent nozzle, and a 42-part assembly with one revolute spool joint.
Every rotor blade is a **twisted loft** — 5 stacked sections per blade with a
per-section `rotationDeg`, built only because of the v0.17 kernel fixes.

## Why memorable

- It reads immediately as a real machine: compressor rows, cans, turbine,
  nozzle and mounts are all where a J85 puts them, with 6 mm tip clearance to
  the casing bore, 2 mm embedded blade roots, and a measured 0-clash
  assembly. The cutaway render shows the hot section in bronze behind the
  cans — not an abstract solid.
- New tools are central: the compressor and turbine blade rows are twisted
  lofts with `rotationDeg`/`twistDeg` (silently ignored before this release),
  and the NGV and turbine sections sit on placed NURBS planes
  (`planes[].origin`, previously dropped → `feature.empty-result`); the
  spinner is a simple revolve. Remove the v0.17 kernel diff and the artifact
  collapses to straight prismatic blades.
- Proof is measured, not asserted: 276-feature evaluate `OK`; `validate`
  clean over 42 parts; `interference --epsilon 20` 0 pairs across 99
  comparisons; exact dfm clearances (bearing↔IGV 1.5445 mm, bearing↔R1
  3.6804 mm); all-phase rotor sweeps 2.161–2.431 mm in the hot section and
  4.558 mm minimum in the compressor; STEP/STL/GLB exports all watertight
  (STL 78.4 MB, 2,916,402 triangles).

## What's new

v0.17 makes lofted-turbomachinery authoring honest:

- `Sketch.loft(other, { planes })` accepts per-plane `rotationDeg`, `twistDeg`
  and `twistCenter`; the lowerer applies `rotationDeg ?? twistDeg·i/(N−1)` per
  section (explicit rotation wins) via the new numeric
  `rotateSketchCommands` helper. Coplanar sections now fail loudly with
  `feature.empty-result` instead of silently degenerating.
- NURBS loft sections honor `planes[].origin` (previously every NURBS section
  landed at the world origin and the loft failed) and reject rotation on
  rail-guided lofts with `feature.invalid-args` instead of ignoring it.
- `Sketch.extrude(depth, { twistAngle })` performs a real twist (spline path,
  replicad under the hood); face-bound extrusions reject non-zero twist and
  non-finite angles with typed `KernelError` codes/hints.
- Unknown option keys on loft/extrude (top-level and per-plane) throw
  `feature.invalid-args`; the skill docs, `listApi` signatures and cheat sheet
  were regenerated to match the shipped behavior (drift test enforced).

Limitations shipped knowingly (full list in the artifact README):
`variableSweep` still lowers only t=0/t=1; rail lofts have no rotated-NURBS
sections; `twistAngle` is ignored for rect/circle/polygon extrude records.
