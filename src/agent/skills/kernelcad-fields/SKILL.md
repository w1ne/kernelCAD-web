---
name: kernelcad-fields
description: Signed-distance fields — sdf.sphere/.box/.cylinder/.torus, sdf.smoothBlend, sdf.materialize — and TPMS lattice infill (body.lattice — gyroid, Schwarz-P, diamond, Neovius; graded, conformal). Use for smooth-blended primitives, organic shapes and lightweight lattice cores.
---

# kernelCAD — signed-distance fields

Compose signed-distance fields (`sdf.sphere/.box/.cylinder/.torus`), blend them smoothly with `sdf.smoothBlend`, then call `sdf.materialize(field, { resolution })` to obtain a standard `Shape` that flows through booleans / fillets / exports.

```ts
const a = sdf.box([60, 40, 6]);          // base plate, axis-aligned, centred at origin
const b = sdf.cylinder(8, 30);           // pin, axis +Z, centred at origin
const field = sdf.smoothBlend(a, b, 3);  // 3 mm smooth fillet at the junction
return sdf.materialize(field, { resolution: 30 });
```

## `sdf` primitive math (mm; centred at origin in local frame)

| Field | Returns |
|---|---|
| `sdf.sphere(r)` | `SdfField` (kind `'sphere'`) |
| `sdf.box([sx, sy, sz])` | `SdfField` (kind `'box'`, axis-aligned, centred) |
| `sdf.cylinder(r, h)` | `SdfField` (kind `'cylinder'`, axis +Z, centred) |
| `sdf.torus(R, r)` | `SdfField` (kind `'torus'`, ring axis +Z, centred) |
| `sdf.smoothBlend(a, b, k)` | `SdfField` (kind `'smoothBlend'`, polynomial smin with blend radius k mm) |
| `sdf.materialize(field, { resolution? })` | `Shape` (kind `sdfMaterialize`; default resolution 30, clamped to [10, 200]) |
| `sdf.bind(name, field)` | binds a field on the session so `evaluate_sdf` can sample it later (side effect; returns void) |

## Composition rules (slice 1)

- **`field.translate(dx, dy, dz)` positions a field before materialize.**
  Primitives live in their local frame; `.translate(...)` returns a new
  `SdfField` offset by `(dx, dy, dz)` mm with the `aabb` shifted to match,
  so the marching-cubes sample region follows. Chained translates compose
  additively. After `sdf.materialize` the result is a `Shape`, not an
  `SdfField` — use the Shape's own `.translate(...)`.
- **`smoothBlend` is union-only.** Smooth-intersect / smooth-difference
  are deferred to slice 2+.
- **`materialize` is synchronous.** It runs marching-cubes on the host
  (Node + browser) and sews in the same call. No async surface.

## Resulting `Shape` limitations

- The output is **polyhedral** — thousands of triangular planar faces, not
  analytic surfaces. Canonical face refs (`'top'`, `'bottom'`, ...) do
  not apply (sphere / box face semantics are lost at materialize).
- `fillet({ face: 'top' })`-style canonical face calls return
  `feature.face-ref.not-applicable`; use inline FaceQuery / EdgeQuery if
  edge-feature scoping is needed.
- Downstream `fillet` / `chamfer` on materialized SDF edges is supported
  in principle but quality is poor and OOM risk is real at high
  resolution; surface as `feature.kernel-failed`.
- Booleans (`union` / `subtract` / `intersect`) **do** work — standard
  Booleans run on the polyhedral solid.

## MCP introspection

- `evaluate_sdf({ file? | code?, fieldName, point: [x, y, z] })` — sample the signed distance from a `sdf.bind('<name>', field)`-bound `SdfField` at a 3D point; returns `{ ok, distance, inside, aabb, kind }`. Side-effect-free; use to verify SDF composition before calling the expensive `sdf.materialize`.

## SDF diagnostic codes

- `feature.sdf.field-undefined` (error) — the SDF returned NaN/Infinity
  at a sample point, or the named `sdf.bind` binding wasn't found by
  `evaluate_sdf`. Causes: `smoothBlend(_, _, 0)` (k must be positive),
  divide-by-zero in a custom field, or a missing/typo'd binding name.
  Use `evaluate_sdf` to probe a point near the failure.
- `feature.sdf.materialize-resolution-out-of-range` (error) —
  `opts.resolution` must be an integer in `[10, 200]`. Use 20-30 for
  typical brackets; 40-60 for fine smooth-blends; 200 is the cap
  (200³ = 8M voxels).

## Memory + perf (measured, slice 1)

Surface-nets emits ~2 triangles per voxel on the surface, then the kernel sews
each triangle as an individual planar face. Sewing
dominates runtime and scales with triangle count (≈ resolution²·surface).
Default resolution 30 is the slice-1 sweet spot: agents can bump it for
fine surface quality at the cost of seconds-to-minutes more capture time.

- `sdf.sphere(2)` res=30 — ~750 tris, ~3 s.
- `sdf.sphere(10)` res=30 — ~7500 tris, ~20 s.
- `sdf.sphere(10)` res=50 — ~22000 tris, ~170 s (long, but still completes).
- `sdf.sphere(10)` res=100 — ~80000 tris, several minutes (use with care).

## Verification gates

After authoring an SDF-rooted Shape, run before reporting done:

| Gate | Pass criterion |
|------|----------------|
| G-eval | `kernelcad evaluate` exits 0 — no `feature.sdf.*` diagnostics |
| G-sdf-finite | `evaluate_sdf` at the AABB centre and three corner samples returns a finite `distance` (no NaN / Infinity) |
| G-smooth-blend-k-positive | Every `sdf.smoothBlend(_, _, k)` has `k > 0` — `k === 0` emits `feature.sdf.field-undefined` |
| G-materialize-resolution-in-range | `resolution` is an integer in `[10, 200]`. Default 30; bump to 40-60 for fine blends; reserve 100+ for hero captures |
| G-no-canonical-face-ref | Materialized output is polyhedral — do not use canonical face refs (`'top'`, `'bottom'`) on a materialize result; use inline queries instead |
| G-translate-after-materialize | Position the `SdfField` with `.translate(dx, dy, dz)` before `sdf.materialize`; once materialized the result is a `Shape`, not an `SdfField`, so only transform it with the Shape's own methods |
| G-bind-name-typo | If using `evaluate_sdf`, the `fieldName` passed in matches a `sdf.bind('<name>', field)` call in the script; mismatch emits `feature.sdf.field-undefined` |

## TPMS lattice infill — `body.lattice({...})`

Fill a finished B-rep body with a triply periodic minimal surface lattice
inside a solid skin. It is the LAST step of the body chain: holes, booleans,
fillets and shells go on the body first.

```ts
const bracket = box(8, 40, 70)
  .hole('left', { u: 0, v: -10, diameter: 5.5, depth: 'through' })
  .union(box(70, 40, 8));
return bracket.lattice({
  type: 'gyroid',           // 'gyroid' | 'schwarzP' | 'diamond' | 'neovius'
  variant: 'sheet',         // 'sheet': wall on the surface | 'network': filled labyrinth
  cell: 6,                  // period, mm
  wall: 0.8,                // sheet wall, mm (or density: solid fraction 0.05-0.9)
  skin: 1.2,                // solid outer skin, mm — follows every face, holes too; 0 = open cells
  grade: { from: 'holes', near: 2, over: 8 },   // 2 mm walls at the bores -> 0.8 mm 8 mm away
});
```

| Option | Meaning |
|---|---|
| `grade: { from: 'surface', near, far?, over }` | wall / density by depth below the skin (smoothstep over `over` mm) |
| `grade: { from: 'holes', near, far?, over }` | by distance to the body's hole walls (concave cylindrical faces) |
| `grade: { from: 'fea', study?, bands? }` | the body's `feaStudy`, solved in process (voxel FEA); von Mises / yield -> the stress-graded infill bands (default <15 % 10 %, 15-40 % 25 %, >40 % 60 %) -> lattice solid fraction |
| `frame: 'part'` (default) / `'world'` / `'cylindrical'` | cells follow the primitive's rotated frame, the world axes, or wrap a whole number of cells around the part Z axis (`axis` overrides) |
| `resolution`, `tolerance` | sample-grid step (default cell / 8) and decimation tolerance (default step / 10) |

**What you get.** A watertight, edge-manifold, consistently outward-wound
triangle MESH solid, not a B-rep (kind `lattice`, backed by a solid mesh
body). Volume, mass properties, bounding box, `render` / `render inspect`
(use `--section` for a cut-away), STL / 3MF / OBJ export and `dfmSpec` work.
STEP / DXF / drawings refuse it (`export.mesh-body.format-unsupported`) and
booleans, fillets or holes after it fail with `feature.lattice.mesh-input`.
Slicers (Orca / Bambu / Prusa / Cura) and mesh tools take the STL / 3MF.

**How it is built.** The body's signed distance and the TPMS field are
sampled on one grid; the solid is meshed as the outer surface plus the
lattice VOID networks (each smooth, so the grid only resolves the cell, not
the wall) by marching tetrahedra — closed and manifold by construction —
then vertices are Newton-projected onto the analytic surface and the mesh
is decimated under a tolerance with topology checks.

**Report** (`feature.lattice.report`, info): designed wall / density range,
measured wall (5th percentile and min across walls, sampled on the built
mesh) and skin, volume and solid fraction of the host body, triangle count,
watertight flag, timings. The sheet wall measures ~4 % under the design value
(first-order surface distance). With `dfmSpec`, `dfm.lattice.wall-too-thin`
fails a lattice whose measured p5 wall is under `minWall` or 2 x nozzle, and
`dfm.lattice.enclosed-cavities` (info) notes that a skin seals the void
network (fine for FDM; drain it for resin / powder).

**Measured cost** (this machine): 60 mm gyroid sheet cube, 6 mm cells, 0.8 mm
wall, 1.2 mm skin: field + mesh ~1.6 s, decimation ~5 s, ~1.8 M triangles
(~88 MB binary STL; 3MF is ~4x smaller). A 30 mm cube: ~1 s, ~0.4 M triangles.

## Related skills

- `kernelcad-authoring` — `sdf.materialize(...)` returns a standard `Shape`; chain `.translate`, `.rotate`, `.union`, `.subtract`, etc. as normal.
- `kernelcad-features` — fillet / chamfer on a materialized result may emit `feature.kernel-failed`; check before relying on it.
- `kernelcad-nurbs` — for freeform curved analytic surfaces, prefer NURBS; SDF is for smooth-blended primitives and organic shapes.
- `kernelcad-mcp` — `evaluate_sdf` is the cheap probe before the expensive `materialize`.
- `kernelcad-fea` — declare the `feaStudy` that `lattice({ grade: { from: 'fea' } })` grades from.
- `kernelcad-print` — `dfmSpec({ process: 'fdm' })` checks the lattice walls against the nozzle.
