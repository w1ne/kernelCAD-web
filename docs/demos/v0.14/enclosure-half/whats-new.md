# v0.14 — enclosure-half watertight sewn solid

## Hero artifact

enclosure-half — a rectangular enclosure half-shell built from six planar
NURBS patches that are trimmed to meet at shared edges and sewn into a
single watertight solid. A boss cylinder with exact 5.0 mm radius (rational
NURBS weights, radius error < 1e-6 mm) rises from the floor panel. The
artifact gates on `isSolid && isClosed` + zero free edges + exact boss
radius, not on a render, so the proof lives in the BREP topology.

## Why memorable

- Reads immediately as a manufacturable enclosure: you see a hollow shell
  with walls, a floor, and a boss post — not an abstract solid or a simple
  extrusion. The surface-finishing operations (trim, sew) are the only
  reason the body exists at all.
- New tools central: the boss radius is exact because rational NURBS weights
  are now honored; the walls and floor become a solid because `sew()` closes
  the shell; none of this was possible before v0.14 (weights silently
  ignored, no sew path).
- Geometric proof, not a visual: the eval gate is `isSolid && isClosed` +
  watertight + exact radius assertion. A render would not distinguish this
  from a filleted box; the BREP analysis does.

## What's new

v0.14 ships the surface-finishing tier: `nurbsSurface`/`surfaceFromBoundary`
now honor rational `weights` for exact conics (E1); `Surface.trimTo(by)` and
`Surface.split(by)` cut patches against planar cutters via
`BRepAlgoAPI_Section` (E2); `sew(surfaces, { requireClosed? })` stitches
patches into a watertight solid via `BRepBuilderAPI_Sewing` +
`BRepBuilderAPI_MakeSolid` (E3); and `Shape.draft()` tapers analytic faces
via `BRepOffsetAPI_DraftAngle` (E4). `add_surface` gains kinds `trim`, `sew`,
and `draft`. Six new diagnostic codes cover the honest limitations: curved-patch
trim refused, split-into-both-halves deferred, named neutral-plane not yet
resolved. Full notes in `CHANGELOG.md`.
