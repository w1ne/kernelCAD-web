---
name: kernelcad-nurbs
description: NURBS surfaces (nurbsSurface, surfaceFromCurves, surfaceFromBoundary, .thicken, .toShape) AND NURBS curves (nurbsCurve, spline3d, hermiteG2) AND multi-section sweeps (variableSweep) AND G1/G2 fillet continuity AND 2D NURBS path segments (path().spline / .nurbsSegment / .hermiteG2). Use for freeform geometry that primitives + sketches cannot express.
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
- `feature.variable-sweep.frenet-degenerate` — Frenet orientation undefined where spine curvature vanishes. Orientation controls are not exposed in the MCP add tool until runtime orientation support is wired.

### variableSweep gotcha — section locations must be on the spine

`BRepOffsetAPI_MakePipeShell::Add_2` requires a location `TopoDS_Vertex` that is one of the spine wire's own sub-shapes. Today the lowerer maps `t=0` to the spine's first vertex and `t=1` to its last vertex; intermediate `t` values are not yet supported (spine subdivision lands as a follow-up). Authoring scripts can still target intermediate spine positions by routing through `nurbsCurve` segments stitched into the spine.

## Filling surfaces — surfaceFromBoundary (Slice C)

`surfaceFromBoundary(curves, opts?)` builds the shipped filling surface: one NURBS face through 4 boundary `Curve3D`s. Lowers to `BRepOffsetAPI_MakeFilling` (direct OCCT) with `Add_1(edge, GeomAbs_Cn, isBound=true)` per boundary. Use for the front face of an eyewear shell, an ergonomic palm rest, or any 4-bounded freeform panel.

```ts
const bottom = nurbsCurve([[0, 0, 0], [25, 0, 1], [50, 0, 0]]);
const right  = nurbsCurve([[50, 0, 0], [50, 12, 0.5], [50, 25, 0]]);
const top    = nurbsCurve([[50, 25, 0], [25, 25, 1], [0, 25, 0]]);
const left   = nurbsCurve([[0, 25, 0], [0, 12, 0.5], [0, 0, 0]]);
const panel  = surfaceFromBoundary([bottom, right, top, left]).thicken(2);
```

The 4 curves must be passed in exact loop order: `curves[0]` = bottom, `curves[1]` = right, `curves[2]` = top, `curves[3]` = left. Adjacent endpoints must coincide within 1e-6 mm — share the corner Vec3 across both meeting curves. `opts.continuity` accepts a single grade (`'C0' | 'C1' | 'C2'`) applied to all 4 edges or a length-4 array per edge; defaults to `'C0'`. `opts.sampling` controls `NbPtsOnCur` (default 15).

The result is a `Surface` peer — chain `.thicken(t)` to get a closed solid or `.toShape()` to wrap as a zero-volume single-face shell for downstream face-aware features.

### surfaceFromBoundary diagnostic codes

- `feature.surface-from-boundary.corner-mismatch` (error) — adjacent boundary endpoints don't coincide within 1e-6 mm. Hint: share the corner Vec3 across the two meeting curves' control nets.
- `feature.surface-from-boundary.too-few-curves` (error) — fewer than 4 curves passed. Hint: build all 4 edges; a 3-sided patch is not supported.
- `feature.surface-from-boundary.too-many-curves` (error) — more than 4 curves passed. Hint: collapse to 4 by stitching adjacent curves with `hermiteG2`.
- `feature.surface-from-boundary.continuity-orphan` (error) — `opts.continuity` is an array but its length is not 4. Hint: pass a single grade or an array of 4 grades (one per edge).
- `feature.surface-from-boundary.degenerate-patch` (error) — OCCT `BRepOffsetAPI_MakeFilling` failed to produce a face (typically because two opposite boundary curves overlap or the loop is non-planar at the corners). Hint: render the 4 input curves and check the loop is a closed quadrilateral with non-degenerate corners.

## Quintic Hermite transitions — hermiteG2 (Slice C)

`hermiteG2(a, b)` builds a 6-control-point quintic NURBS `Curve3D` that interpolates two endpoints with matching positions, first derivatives (tangents), and second derivatives (curvatures). Use to bridge two existing `nurbsCurve` flanks into a single G2-continuous compound spine that `variableSweep` can sweep without showing a kink at the join.

```ts
const flankL = nurbsCurve([[-30, 0, 0], [-20, 4, 0], [-10, 4, 0]]);
const flankR = nurbsCurve([[ 10, 4, 0], [ 20, 4, 0], [ 30, 0, 0]]);
const bridge = hermiteG2(
  { point: [-10, 4, 0], tangent: [10, 0, 0], curvature: [0, -0.05, 0] },
  { point: [ 10, 4, 0], tangent: [10, 0, 0], curvature: [0, -0.05, 0] },
);
```

**Tangent magnitude matters.** It is the *first derivative*, NOT the unit tangent — magnitude controls how aggressively the curve heads out of the endpoint. Typical magnitude is in the order of the chord length between the two endpoints. A tangent of `[1, 0, 0]` between points 30 mm apart will sag dramatically; `[15, 0, 0]` shapes a balanced bridge. Curvature defaults to `[0, 0, 0]`, which makes the curve only G1 (lifted cubic Hermite). For true G2 continuity to a neighbouring `spline3d` or `nurbsCurve`, evaluate the neighbour's `.tangentAt(t)` and `.pointAt(t)` (curvature has no synchronous getter today — use a numerical second-derivative estimate via three sample points).

### hermiteG2 diagnostic codes

- `feature.hermite-g2.non-finite-input` (error) — any `NaN`/`Infinity` in `point`, `tangent`, or `curvature`. Hint: confirm every Vec3 entry is a finite number.
- `feature.hermite-g2.degenerate-tangent` (error) — tangent magnitude < 1e-12 on either endpoint. Hint: pass a non-zero tangent vector; for a unit start direction, scale by chord length.

## G1/G2 fillet continuity (Slice C)

`Shape.fillet(radius, edges?, { continuity })` accepts `'G1'` (default — tangent-continuous polynomial blend, `ChFi3d_Polynomial`) and `'G2'` (curvature-continuous rational blend, `ChFi3d_Rational`). `'G2'` is preferred on edges adjacent to a NURBS surface (from `surfaceFromBoundary` / `nurbsSurface` / `surfaceFromCurves`) so the blend does not introduce a visible curvature crease at the surface-to-fillet boundary.

```ts
const panel = surfaceFromBoundary([bottom, right, top, left]).thicken(2);
const filleted = panel.fillet(1.5, undefined, { continuity: 'G2' });
```

### feature.fillet.continuity-not-applicable warning

Emitted when the requested `'G2'` continuity cannot improve the blend at the chosen edge. Hint: requesting `'G2'` on a fillet whose adjacent faces are only G1-continuous downgrades to G1 internally.

### G1-vs-G2 BREP-identity gotcha — planar/cylindrical fillets

**Constant-radius fillets between planar faces or between a planar face and a cylindrical face produce BREP-identical output under both `'G1'` and `'G2'`.** OCCT's rational-fillet path only diverges from the polynomial path when the adjacent faces carry non-trivial parametric curvature (`nurbsSurface` / `surfaceFromBoundary` / `surfaceFromCurves`). Thread `continuity: 'G2'` through your authoring layer for forward-compatibility with future surface-adjacent fillets, but do NOT gate on a different lowered BREP — verify the upgrade on a NURBS-adjacent edge, not on a box corner. Eyewear front faces lifted from `surfaceFromBoundary` ARE NURBS-adjacent; cylindrical lens openings cut through a flat box are NOT.

## 2D NURBS path segments (Slice D)

The `PathBuilder` returned by `path()` accepts three NURBS-backed segment operations alongside the existing line / arc / smoothSpline primitives. Use them when the existing arc family cannot express the desired 2D outline (eyewear brow, sneaker midsole, ergonomic grip silhouette, lens-opening cutouts that aren't perfect circles).

```ts
// .spline(points) — N-waypoint B-spline interpolation. Threads a degree-3
// B-spline through every waypoint; first must match current pen position.
const brow = path()
  .moveTo(-60, 0)
  .spline([[-60, 0], [-30, 8], [0, 12], [30, 8], [60, 0]])
  .close();

// .nurbsSegment(controlPoints, opts?) — explicit B-spline control polygon.
// controlPoints[0] must match current pen position; opts.degree default 3.
const explicit = path()
  .moveTo(0, 0)
  .nurbsSegment([[0, 0], [5, 10], [15, 10], [20, 0]], { degree: 3 })
  .lineTo(20, -5)
  .close();

// .hermiteG2(a, b) — 2D quintic-Hermite transition. a.point must match the
// current pen position. tangent magnitude is the first derivative (typical
// magnitude ~ chord length, NOT unit length). curvature optional — defaults
// to [0, 0] (degrades to G1).
const transition = path()
  .moveTo(-10, 0)
  .hermiteG2(
    { point: [-10, 0], tangent: [0, 5], curvature: [0, 0] },
    { point: [ 10, 0], tangent: [0, -5], curvature: [0, 0] },
  )
  .close();
```

All three methods accept `Editable<number>` coords so symbolic params survive into capture. Coords are mm; the lowerer composes the resulting OCCT edges with replicad-drawn edges via `BRepBuilderAPI_MakeWire`.

### 2D path NURBS diagnostic codes

- `feature.path.spline.degenerate-points` (error) — fewer than 2 points, NaN coord, or two consecutive duplicates within 1e-9 mm. Hint: pass ≥ 2 distinct finite Vec2 waypoints.
- `feature.path.nurbs-segment.degenerate-controls` (error) — fewer than `degree + 1` control points, non-finite coord, or `controlPoints[0]` not matching current pen position within 1e-6 mm. Hint: provide at least degree+1 finite Vec2 control points with the first matching the current pen position.
- `feature.path.nurbs-segment.weights-non-positive` (error) — weight ≤ 0. Hint: weights must be strictly positive (zero collapses the basis; negative is undefined for B-splines).
- `feature.path.hermite-g2.start-mismatch` (error) — `a.point` not matching current pen position within 1e-6 mm. Hint: align `a.point` with the path's current position, or call `moveTo` first.

### Gotchas (real, not hypothetical)

1. **Skinned-surface lofts can't consume NURBS sketches.** `surfaceFromCurves(sections)` lowers each `Sketch` through a raw `Drawing` cast (`nurbsSurfaceLowerer.buildSkinnedSurface`); the NURBS-aware sketch lowerer is bypassed in that path. Use `path().spline(...)` for extruded subtractive cutouts and standalone closed profiles; do NOT pass `path().spline(...)` sketches as `surfaceFromCurves` sections. For freeform sections that need lofting, use Slice C's `surfaceFromBoundary` filling surface or stick to line/arc primitives in the section profile.
2. **`makeBSplineApproximation` can overshoot the waypoint y-extent** at the default `tolerance: 1e-4` (peak ~75% overshoot observed in Slice D Task 3). If overshoot pollutes the silhouette, either tighten the tolerance through `opts.tension`, or switch to `.nurbsSegment(controlPoints, ...)` for explicit shape control where precision beats convenience.
3. **Wire-discontinuity is defensively tolerated.** Capture-time validation rejects obvious gaps (start-mismatch within 1e-6 mm for `.nurbsSegment` / `.hermiteG2`), but OCCT's `assembleWire` silently bridges sub-tolerance gaps in the lowerer — this is acceptable for v1; explicit gap-gating is queued for a follow-up slice.

## Related skills

- `kernelcad-authoring` — primitives + sketches still cover most shapes; reach for NURBS only when the freeform contour can't be expressed.
- `kernelcad-features` — `.thicken(t)` returns a Shape that participates in all standard booleans and face/edge features.
- `kernelcad-from-reference` — when matching a domed/curved real object (lens, dial, dome).
