---
name: kernelcad-nurbs
description: NURBS surfaces (nurbsSurface, surfaceFromCurves, .thicken, .toShape) AND NURBS curves (nurbsCurve, spline3d) AND multi-section sweeps (variableSweep). Use for freeform geometry that primitives + sketches cannot express.
---

# kernelCAD — NURBS surfaces & curves

Build free-form panels, lofted shells, organic spines, and tapered swept solids whose result enters the existing Shape pipeline (booleans, fillets, exports).

```ts
// Lofted free-form panel from sketch sections
const s0 = path().moveTo(-30, -10).lineTo(30, -10).lineTo(30, 10).lineTo(-30, 10).close();
// (use sketch('xy', { offset: <z> }).path()...close() to place sections at different z)
const panel = surfaceFromCurves([s0, s1]).thicken(2);
```

`nurbsSurface({ controls, degree, weights?, knots?, periodic? })` returns a `Surface` peer to `Shape`. The `Surface` exposes exactly two escape methods:

| Method | Returns | Notes |
|---|---|---|
| `.thicken(t)` | `Shape` (closed solid) | Offsets both sides by `t` mm via `BRepOffsetAPI_MakeThickSolid.MakeThickSolidBySimple`. `t` accepts `Editable<number>`. |
| `.toShape()` | `Shape` (zero-volume shell) | Single-face Shape; use as profile placeholder for future face-aware features. |

`surfaceFromCurves(sections)` skins through 2+ closed `Sketch` cross-sections in declaration order. Section order = skin direction.

Slice-1 caveat: `weights` is accepted but silently ignored — every surface is built as a non-rational B-spline today. For an "exact circle" tube you currently need either a fine polygonal approximation (16+ control points around the circumference, degree 1 in U) or a section-skinned approach with explicit circle sketches per section.

### NURBS diagnostic codes

- `feature.nurbs.degenerate-controls` (error) — `controls` is empty, jagged, contains non-finite points, or `weights` doesn't match the controls grid shape. Hint: pass a non-empty rectangular Vec3 grid spanning a 2D extent.
- `feature.nurbs.degree-mismatch` (error) — `degree.u > controls.length - 1` (or v-analog) or `< 1`. Hint: reduce degree, or add control points.

## Verification gates

After authoring a NURBS surface, run before reporting done:

| Gate | Pass criterion |
|------|----------------|
| G-eval | `kernelcad evaluate` exits 0 — no `feature.nurbs.degenerate-controls` or `feature.nurbs.degree-mismatch` |
| G-controls-finite | Every control point is a finite Vec3 (no `NaN`, no `Infinity`); grid is rectangular (every row same length) |
| G-degree-leq-controls | `degree.u ≤ controls.length − 1` and `degree.v ≤ controls[0].length − 1` |
| G-thicken-clearance | `.thicken(t)` extends along the surface NORMAL by `t`; verify the offset solid does not overlap any neighboring part (run `kernelcad interference`) |
| G-opaque-renderer-trap | The studio render path uses `MeshLambertMaterial` (opaque-only). Color values like `#dfeef4` look like glass at API level but render OPAQUE. **Place numerals / hands / decals on top OR outside the dome footprint** if they must remain visible; do not assume the renderer will see through them |
| G-periodic-v-vs-seam | A square-grid loft from polar samples creates a wedge seam at θ=0; use `periodic: { v: true }` and a polar control grid (radial × angular) to remove the seam |

The opaque-renderer trap and the periodic-V seam gate were learned in the v0.7 pocket-watch hero capture — both are real production gotchas, not hypothetical.

## NURBS curves (Slice B)

`Curve3D` is a peer-type alongside `Shape` and `Surface`. It captures a 3D parametric curve and lowers to a `TopoDS_Edge` backed by `Geom_BSplineCurve` (direct OCCT, no replicad wrapper). Curves park their edges on `session.importedGeometry` and are consumed by `variableSweep` (and future `surfaceFromBoundary` / G2 blends in Slice C).

```ts
// Explicit control net — defaults to cubic non-rational.
const spine = nurbsCurve(
  [[0, 0, 0], [10, 5, 0], [20, -5, 10], [30, 0, 5]],
  { degree: 3 },
);

// Catmull-Rom convenience that interpolates waypoints.
const brow = spline3d([
  [-65, 35, 0],
  [-20, 42, 4],
  [ 20, 42, 4],
  [ 65, 35, 0],
], { tension: 0.5 });
```

`Curve3D` exposes synchronous evaluation: `.sample(n)` (returns n+1 points), `.pointAt(t)`, `.tangentAt(t)` (unit vector), `.length()` (arc length in mm), `.domain()` (always `[0, 1]`). Evaluation lazily lowers the curve through `BRepAdaptor_Curve`; per-session cache keeps repeat calls cheap.

### Curve3D diagnostic codes

- `feature.curve3d.degenerate-controls` — fewer than `degree + 1` control points.
- `feature.curve3d.weights-length-mismatch` — weights array length ≠ controlPoints length.
- `feature.curve3d.weights-non-positive` — a weight is zero or negative (undefined for B-splines).
- `feature.curve3d.knots-length-mismatch` — knot count ≠ controlPoints.length + degree + 1.
- `feature.curve3d.closed-endpoints-mismatch` — `closed: true` but first ≠ last (warn; OCCT closes internally).

## Multi-section sweep — variableSweep (Slice B)

Blend two or more profile sketches along a spine. Lowers to `BRepOffsetAPI_MakePipeShell`. Use for tapered limbs (wing sections, fairings), varying-cross-section sweeps that lofts cannot express because they need an explicit spine path, eyewear temples that taper along a curved spine.

```ts
const spine = spline3d([[-50, 0, 0], [-20, 6, 4], [20, 6, 4], [50, 0, 0]]);
const big   = path().moveTo(-3, -3).lineTo(3, -3).lineTo(3, 3).lineTo(-3, 3).close();
const small = path().moveTo(-1, -1).lineTo(1, -1).lineTo(1, 1).lineTo(-1, 1).close();
const limb = variableSweep(spine, [
  { t: 0, profile: big },
  { t: 1, profile: small },
]);
```

Spine accepts a `Curve3D`, a planar `Sketch` (its lifted outer wire is used as the rail), or a `Vec3[]` (auto-converted to a `nurbsCurve` of degree `min(3, n-1)`). Sections must be strictly increasing in `t`; the first MUST sit at `t=0` and the last at `t=1` (full-spine coverage).

### variableSweep diagnostic codes

- `feature.variable-sweep.sections-out-of-order` — t values not strictly increasing.
- `feature.variable-sweep.sections-not-spanning` — first t ≠ 0 or last t ≠ 1, or fewer than 2 sections.
- `feature.variable-sweep.spine-too-short` — spine is shorter than the smallest profile bounding diameter (the sweep would self-intersect).
- `feature.variable-sweep.profile-not-planar` — profile is non-planar.
- `feature.variable-sweep.profile-empty` — profile sketch is empty (path() not closed).
- `feature.variable-sweep.frenet-degenerate` — Frenet orientation undefined where spine curvature vanishes; pass `orientation: { up: Vec3 }` or `"corrected-frenet"`.

### variableSweep gotcha — section locations must be on the spine

`BRepOffsetAPI_MakePipeShell::Add_2` requires a location `TopoDS_Vertex` that is one of the spine wire's own sub-shapes. Today the lowerer maps `t=0` to the spine's first vertex and `t=1` to its last vertex; intermediate `t` values are not yet supported (spine subdivision lands as a follow-up). Authoring scripts can still target intermediate spine positions by routing through `nurbsCurve` segments stitched into the spine.

## Related skills

- `kernelcad-authoring` — primitives + sketches still cover most shapes; reach for NURBS only when the freeform contour can't be expressed.
- `kernelcad-features` — `.thicken(t)` returns a Shape that participates in all standard booleans and face/edge features.
- `kernelcad-from-reference` — when matching a domed/curved real object (lens, dial, dome).
