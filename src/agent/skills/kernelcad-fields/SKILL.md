---
name: kernelcad-fields
description: Signed-distance fields — sdf.sphere/.box/.cylinder/.torus, sdf.smoothBlend, sdf.materialize. Use for smooth-blended primitives and organic shapes that BREP fillet cannot reach; result is a standard Shape.
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

- **No `field.translate(...)`.** Slice-1 primitives live in their local
  frame. To position the result, compose primitives whose origins align
  (e.g. two coaxial spheres), call `sdf.materialize`, then translate the
  resulting `Shape` (`.translate(x, y, z)`).
- **`smoothBlend` is union-only.** Smooth-intersect / smooth-difference
  are deferred to slice 2+.
- **`materialize` is synchronous.** It runs marching-cubes on the host
  (Node + browser) and synchronously sews via OCCT WASM. No async surface.

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
  OCCT BREP booleans operate on the polyhedral solid.

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

Surface-nets emits ~2 triangles per voxel on the surface, then OCCT sews
each triangle as an individual planar face. The OCCT sewing step
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
| G-translate-after-materialize | If positioning is needed, call `.translate(...)` on the `Shape` returned by `sdf.materialize`, not on the `SdfField` |
| G-bind-name-typo | If using `evaluate_sdf`, the `fieldName` passed in matches a `sdf.bind('<name>', field)` call in the script; mismatch emits `feature.sdf.field-undefined` |

## Related skills

- `kernelcad-authoring` — `sdf.materialize(...)` returns a standard `Shape`; chain `.translate`, `.rotate`, `.union`, `.subtract`, etc. as normal.
- `kernelcad-features` — fillet / chamfer on a materialized result may emit `feature.kernel-failed`; check before relying on it.
- `kernelcad-nurbs` — for freeform curved analytic surfaces, prefer NURBS; SDF is for smooth-blended primitives and organic shapes.
- `kernelcad-mcp` — `evaluate_sdf` is the cheap probe before the expensive `materialize`.
