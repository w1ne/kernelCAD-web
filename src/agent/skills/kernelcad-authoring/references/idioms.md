# kernelCAD authoring reference — idioms from other CAD scripting vocabularies

The call to write here for names an author tends to reach for. Same content `lookup_api` returns as `idioms`.

## Idiom translations

`lookup_api({ query })` answers the names you would reach for as well as the ones the API has (try `arcTo`, `polarArray`, `workplane`, `cboreHole`); a call to a name that does not exist fails with the replacement in the hint. The common translations:

| You would write | In kernelCAD |
|---|---|
| a current workplane, then draw and extrude | no plane stack: `path()` draws in XY, `.extrude(d)` goes +Z; `rotateX(90)` turns it into the XZ plane. Features land on a face by name: `hole('top', ...)`, `cutout(profile, { face })` |
| `faces(">Z")`, `edges("\|Z")`, `edges(">Z")` selector strings | queries: `{ byNormal: 'Z', extreme: 'Z' }` (highest up-facing face), `selectEdges(body, { parallel: 'Z' })`, `selectEdges(body, { atZ: h })`; `select(edges).sortBy('Z').last` ranks a resolved list |
| `faces(">Z").edges().fillet(r)` / `.chamfer(d)` | `.fillet(r, { face: 'top' })` / `.chamfer(d, { face: 'top' })`, or `{ ofFace: <FaceQuery> }` inside `selectEdges` |
| `cboreHole`, `cskHole`, `hole` | `hole(face, { u, v, diameter, depth, counterbore: { diameter, depth } })`; one diameter per call, `u`/`v` from the face centre |
| `pushPoints`, `rarray`, `polarArray` | compute `positions: [{ u, v }, ...]` in JS for `holes()`; bodies use `patternLinear` / `patternGrid` / `patternCircular({ count, axis: 'Z', pivot: [cx, cy, cz] })` (`pivot` is a point on the axis line; omit it to rotate about the origin) |
| `slot2D`, an arc by end point | `path().slot(cx, cy, { width, centerDistance })`; arcs are `threePointsArc`, `radiusArc`, `sagittaArc`, `bulgeArc`, `tangentArc` |
| `extrude(d, both=True)` | `extrude(d, { symmetric: true })` |
| `revolve(angle, axisStart, axisEnd)` | profile with x = radius, then `revolve({ angleDeg })` about Z |
| `shell(-t)` on a face | `shell(t, { face: 'top' })` with a positive wall |
| `cut` / `union` / `intersect` | `.subtract(b)` / `.union(b)` / `.intersect(b)` |
| exporting from the script | return the Shape; export with `kernelcad export` or the export tool |
