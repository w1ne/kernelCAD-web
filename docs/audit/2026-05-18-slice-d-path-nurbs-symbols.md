# Slice D path-NURBS symbol audit (2026-05-18)

Sources of truth:
- `node_modules/replicad/dist/replicad.d.ts` (2D pen + drawing API)
- `node_modules/replicad-opencascadejs/src/replicad_single.d.ts` (raw OCCT
  bindings — same bundle the Slice B / Slice C lowerers used)

Audit performed during the Slice D kickoff (`feat/nurbs-slice-d-audit-and-capture`)
before the lowerer is touched, so Task 3 can branch on the actual binding
shape rather than the plan's optimistic guesses.

## Replicad 2D pen — does it expose a NURBS / B-spline segment?

**Answer: NO.** `BaseSketcher2d` (the base class for all 2D sketchers —
`BlueprintSketcher`, `DrawingPen`, `FaceSketcher`, `Sketcher`) has the
following curve constructors, per `replicad.d.ts:176-247`:

- `lineTo`, `line`, `vLine`, `hLine`, `vLineTo`, `hLineTo`,
  `polarLineTo`, `polarLine`, `tangentLine`
- `threePointsArcTo`, `sagittaArcTo`, `bulgeArcTo`, `tangentArcTo`,
  `ellipseTo`, `halfEllipseTo` (+ delta-relative variants)
- `bezierCurveTo`, `quadraticBezierCurveTo`, `cubicBezierCurveTo`
- `smoothSplineTo`, `smoothSpline` — C1-smooth single segment between two
  points (a wrapped cubic Bezier under the hood; NOT a general-degree
  B-spline)

There is **no** `nurbsCurveTo` / `splineTo` / `bsplineTo` /
`curveTo(edge)` method. The pen does not accept a pre-constructed
`replicad.Edge` to splice into its `pendingCurves: Curve2D[]` list. The
`pendingCurves` field is `protected`, so a subclass *could* in principle
append to it, but `Curve2D` is a replicad-internal opaque class, not a
public type we can construct freely from a `TopoDS_Edge`.

## Replicad's Drawing-level NURBS APIs (the high-leverage finding)

Three drawing-level helpers that DO build NURBS-quality drawings, all
returning a complete `Drawing` (not splice-able into an open pen):

- `replicad.makeBSplineApproximation(points: Point[], { tolerance, smoothing, degMax, degMin })` →
  **`replicad.Edge`** (lines 1564, 355-360). Builds a B-spline edge that
  approximates the input waypoints — exactly what `.spline()` wants.
- `replicad.drawPointsInterpolation(points: Point2D[], approximationConfig?, options?: { closeShape?: boolean })` →
  **`Drawing`** (line 802). Wraps `makeBSplineApproximation` into a
  full closed Drawing — useful for Task 6 (eyewear-wayfarer-front), but
  NOT for Task 3 since we need to splice the spline INTO a path that has
  other segments.
- `replicad.drawParametricFunction(func, { pointsCount, start, stop, closeShape }?, approximationConfig?)` →
  **`Drawing`** (line 790, neighbour signature) — same shape as
  drawPointsInterpolation but driven by a parametric `t → Point2D` function.

There is no `assembleDrawing` analogue — `replicad.assembleWire`
(line 169: `(listOfEdges: (Edge | Wire)[]) => Wire`) does exist for the 3D
side but operates on `Edge` / `Wire`, not `Drawing` / `Curve2D`.

## OCCT — direct B-spline edge construction (confirmed, identical to Slice B)

- `Geom_BSplineCurve_1(Poles, Knots, Multiplicities, Degree, Periodic)` —
  line 743. Non-rational variant. Already used by
  `src/modeling/backends/occt/curve3dLowerer.ts:90` (Slice B Task 5).
- `Geom_BSplineCurve_2(Poles, Weights, Knots, Multiplicities, Degree,
  Periodic, CheckRational)` — line 747. Rational variant.
- `Handle_Geom_BSplineCurve_2(Geom_BSplineCurve)` — line 763.
- `BRepBuilderAPI_MakeEdge_24(Handle_Geom_Curve)` — already used
  (`curve3dLowerer.ts:101`).

**`Geom2d_BSplineCurve` (the 2D-specific class):** referenced indirectly
(`Handle_Geom2d_BSplineCurve` appears on lines 198, 1108, 1112, 1116,
1134-1135 inside other classes' signatures) but the constructor for the
class itself is NOT exposed in the public `d.ts`. We do not need it —
lifting the 2D control points to 3D via `(x, y) → (x, y, 0)` and reusing
`Geom_BSplineCurve_1` is mechanically identical and the code path is
already proven by Slice B.

## `BRepBuilderAPI_MakeWire` overloads (the critical Task 3 enabler)

`replicad_single.d.ts:6739-6779` — 7 constructor overloads plus a single
`Add_1(E: TopoDS_Edge)` instance method:

```
class BRepBuilderAPI_MakeWire {
  Add_1(E: TopoDS_Edge): void;
  Add_2(W: TopoDS_Wire): void;
  Add_3(L: TopTools_ListOfShape): void;
  Wire(): TopoDS_Wire;
  ...
}
BRepBuilderAPI_MakeWire_1()               // empty, add edges via Add_*
BRepBuilderAPI_MakeWire_2(E)              // one edge
BRepBuilderAPI_MakeWire_3..5(E, [E, [E, [E]]])   // 2/3/4 edges directly
BRepBuilderAPI_MakeWire_6(W)              // wire
BRepBuilderAPI_MakeWire_7(W, E)           // wire + edge
```

This means `MakeWire_1` + iterative `Add_1(edge)` accepts a mixed list of
edges from any source: edges extracted from a replicad `Drawing` (via
TopoDS introspection) AND edges built directly from `Geom_BSplineCurve_1`
via `BRepBuilderAPI_MakeEdge_24`. The wire builder treats them
identically as `TopoDS_Edge` instances.

`replicad.assembleWire(listOfEdges: (Edge | Wire)[]) => Wire`
(line 169) is a higher-level alternative — accepts replicad `Edge`
wrappers (which carry a `TopoDS_Edge` internally). Either path works;
`MakeWire_1` is closer to the lowerer's existing OCCT-direct style.

## Conclusions

- **Slice D Task 3 (sketch lowerer extension) is GREEN.**
  `replicad.makeBSplineApproximation` returns a `replicad.Edge` we can
  extract a `TopoDS_Edge` from; `Geom_BSplineCurve_1` + `MakeEdge_24` give
  us direct-OCCT NURBS edges; `BRepBuilderAPI_MakeWire_1` composes both
  into a single wire. No fallback to polyline approximation is needed.

- **Recommended Task 3 strategy:**
  1. Walk the `SketchCommand[]` and partition into runs: replicad-handled
     segments (`moveTo`, `lineTo`, all arc kinds, `smoothSpline`) stay
     inside the existing `DrawingPen` path; NURBS segments (`spline`,
     `nurbsSegment`, `hermiteG2_2d`) build standalone `TopoDS_Edge`s via
     direct OCCT.
  2. For `spline`: call `replicad.makeBSplineApproximation(points, {
     tolerance: 1e-4, degMax: 3, degMin: 3 })` and extract its
     `TopoDS_Edge`. (If extraction proves awkward, fall back to building
     a `Geom_BSplineCurve_1` from a Catmull-Rom-to-Bezier conversion of
     the waypoints — Slice B's `spline3d` math.)
  3. For `nurbsSegment`: build `Geom_BSplineCurve_1` (or `_2` when weights
     present) with the control points lifted to `(x, y, 0)`. Knot vector
     defaults to clamped uniform `clampedUniformKnots(N, degree)` (same
     helper Slice B uses).
  4. For `hermiteG2_2d`: lift endpoints to `(x, y, 0)`, call
     `solveHermiteG2(...)` to get 6 Bezier control points, build a
     degree-5 `Geom_BSplineCurve_1` exactly as Slice B Task 5 does.
  5. Assemble the wire with `BRepBuilderAPI_MakeWire_1` + iterative
     `Add_1(edge)` over the mixed list of edges in path order. Pen
     segments are extracted from the replicad Drawing via
     `TopExp_Explorer` + `TopAbs_EDGE` (pattern already used elsewhere in
     `occtBackend.ts`).

- **No new dependencies; no polyline approximation; no quality loss.**

## Verified by

```bash
grep -nE "makeBSplineApproximation|drawPointsInterpolation|class BaseSketcher2d|BSplineApproximationConfig" \
  node_modules/replicad/dist/replicad.d.ts
grep -nE "BRepBuilderAPI_MakeWire|Geom_BSplineCurve_[12]|Handle_Geom_BSplineCurve_2|BRepBuilderAPI_MakeEdge_24" \
  node_modules/replicad-opencascadejs/src/replicad_single.d.ts
```
