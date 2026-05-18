# Slice C OCCT symbol audit (2026-05-18)

Source of truth: `node_modules/replicad-opencascadejs/src/replicad_single.d.ts`
(the bundle currently shipped with kernelCAD-web). Audit performed during the
Slice C kickoff (`feat/nurbs-slice-c-audit-and-types`) before any capture-side
or lowerer code is written, so that Tasks 3-11 can branch on the actual
binding shape rather than the plan's optimistic guesses.

## surfaceFromBoundary

- **`BRepFill_Filling`: MISSING.** No `BRepFill_*` class is exported beyond
  `BRepFill_TypeOfContact` (an enum used by `BRepOffsetAPI_MakePipeShell`).
  The plan's name does not exist in this bundle.
- **`BRepOffsetAPI_MakeFilling`: PRESENT** (line 7630 of `replicad_single.d.ts`).
  This is the same algorithm under a different class name and exposes
  everything Slice C needs:
  - Single constructor (no `_N` variants) with the full 10-arg signature
    matching the plan's intended call:
    ```
    constructor(Degree, NbPtsOnCur, NbIter, Anisotropie, Tol2d, Tol3d,
                TolAng, TolCurv, MaxDeg, MaxSegments)
    ```
  - **Add overloads (5 variants):**
    - `Add_1(Constr: TopoDS_Edge, Order: GeomAbs_Shape, IsBound: Standard_Boolean): number`
      — the variant Slice C wants (boundary edge with continuity flag).
    - `Add_2(Constr: TopoDS_Edge, Support: TopoDS_Face, Order, IsBound)`
      — adds an edge that lies on an existing support face (for tangent
      continuity to a neighbour patch).
    - `Add_3(Support: TopoDS_Face, Order)` — adds a whole face as a tangency
      constraint.
    - `Add_4(Point: gp_Pnt)` — adds an interior pass-through point.
    - `Add_5(U, V, Support, Order)` — UV-parameter constraint.
  - `Build(theRange: Message_ProgressRange): void`, `IsDone(): boolean`.
  - `G0Error_1()`, `G1Error_1()`, `G2Error_1()` — actual achieved error per
    continuity grade, useful for Slice C diagnostics.
  - Inherited `Shape(): TopoDS_Shape` from `BRepBuilderAPI_MakeShape` (the
    plan's `.Face()` does not exist; cast the shape via `TopoDS.Face_1(...)`
    or `TopExp_Explorer` on the result).
- **`GeomAbs_Shape`: PRESENT** as an enum-style namespace (line 6504) with
  the full set required for the C0/C1/C2 + G1/G2 mapping:
  - `GeomAbs_C0`, `GeomAbs_G1`, `GeomAbs_C1`, `GeomAbs_G2`, `GeomAbs_C2`,
    `GeomAbs_C3`, `GeomAbs_CN`.
- **`BRepBuilderAPI_MakeFace`: PRESENT** (not strictly needed; Filling already
  returns a `TopoDS_Shape` containing a face). Re-wrapping is not required for
  Slice C.

**Verdict:** Slice C surfaceFromBoundary is **GREEN**, with one trivial
rename: the plan's `BRepFill_Filling` references all need to be rewritten as
`BRepOffsetAPI_MakeFilling`, the `Add_2(edge, order, isBound)` call becomes
`Add_1(edge, order, isBound)`, and `.Face()` becomes `TopoDS.Face_1(.Shape())`.

## G1/G2 fillet

- **`BRepFilletAPI_MakeFillet`: PRESENT** (line 3349). Constructor:
  ```
  constructor(S: TopoDS_Shape, FShape: ChFi3d_FilletShape)
  ```
  Accepts a `ChFi3d_FilletShape` value at construction (so Slice C can pass
  the continuity-flavoured enum directly without a follow-up `SetFilletShape`
  call).
- **`SetFilletShape(FShape: ChFi3d_FilletShape)`: PRESENT** (line 3372) —
  also reachable post-construction.
- **`SetContinuity(InternalContinuity: GeomAbs_Shape, AngularTolerance)`:
  PRESENT** (line 3352) — a parallel knob for setting the internal blend
  surface continuity to `GeomAbs_G2` directly. This is a stronger guarantee
  than `SetFilletShape` and is the right call when the plan asks for
  `continuity: 'G2'`. Bonus: orthogonal to the rational/polynomial choice.
- **`ChFi3d_FilletShape`: PRESENT** (line 7039) with all three OCCT values:
  - `ChFi3d_Rational` — rational Bezier blend surface (G2-capable).
  - `ChFi3d_QuasiAngular` — quasi-angular polynomial.
  - `ChFi3d_Polynomial` — polynomial Bezier (G1-only).
  - (The plan's Case-C contingency — "ChFi3d_Rational missing" — does not
    apply; the binding ships all three values.)

**Verdict:** Slice C G1/G2 fillet is **GREEN**, with one note: prefer
`SetContinuity(oc.GeomAbs_Shape.GeomAbs_G2, tol)` for the user-visible
guarantee, and use `ChFi3d_Rational` (set at constructor time) as the
matching surface form. The plan's `if (anyG2 && oc.ChFi3d?.ChFi3d_Rational
!== undefined)` runtime guard becomes dead code (always true) but is cheap
to keep as a defence-in-depth check.

## hermiteG2

- **`Geom_BSplineCurve` degree=5 path: VERIFIED.** Slice B's
  `src/modeling/backends/occt/curve3dLowerer.ts` already passes `m.degree`
  directly to `new oc.Geom_BSplineCurve_1(...)` / `_2(...)` without any
  branch on degree. The shared `clampedUniformKnots(n, degree)` helper that
  Slice B introduced produces a correctly-clamped knot vector for any
  `(n, degree)` pair where `n >= degree + 1` — a 6-control-point quintic
  matches `n = 6`, `degree = 5`, and the resulting Bezier-style knot
  vector `[0,0,0,0,0,0,1,1,1,1,1,1]` is exactly what a single-segment
  quintic Bezier needs.
- **No new OCCT symbols required.** Task 5 is pure JS arithmetic
  (the quintic Hermite -> 6-Bezier-control-point conversion in the plan's
  §Task 5 Step 2) feeding into Slice B's existing `addCurve3D(...)`. No
  WASM rebuild, no symbol guards.

**Verdict:** Slice C hermiteG2 is **GREEN**.

## Conclusions

- **Task 4 (surfaceFromBoundary): GREEN** — `BRepOffsetAPI_MakeFilling` is
  the actual class name (plan said `BRepFill_Filling`); identical behaviour.
- **Task 6 (G1/G2 fillet): GREEN** — `ChFi3d_Rational` and the
  `SetContinuity(GeomAbs_G2, tol)` knob are both available. The plan's Case-C
  "G2 missing → downgrade with warning" contingency is unnecessary; Slice C
  can ship full G2 directly.
- **Task 5 (hermiteG2): GREEN** — solved entirely on top of Slice B; no new
  OCCT plumbing.

**Recommended workarounds for RED items:** none — there are no RED items.

**Recommended plan-text amendments** (to be folded into the Slice C plan
before Tasks 3-11 dispatch):

1. Replace every `BRepFill_Filling` occurrence with `BRepOffsetAPI_MakeFilling`
   in the plan and any forthcoming lowerer skeleton.
2. Replace the `.Face()` accessor with `.Shape()` plus a `TopoDS.Face_1(...)`
   downcast.
3. Use `Add_1(edge, order, isBound)` (not `Add_2`) for the boundary-edge
   constraint variant. `Add_2` exists but takes a `Support` face — irrelevant
   for the Coons-patch boundary, useful only if a future iteration adds
   tangency to an existing neighbour surface.
4. In `OcctBackend.filletVariable`, set the rational-surface form at
   construction (`new BRepFilletAPI_MakeFillet(shape, ChFi3d_Rational)` when
   any group requests `'G2'`) AND call
   `mkFillet.SetContinuity(GeomAbs_G2, 1e-6)` for the corresponding internal
   continuity guarantee. The `oc.ChFi3d?.ChFi3d_Rational !== undefined`
   runtime guard can be dropped — the symbol is always present in the
   current bundle — but the cost of keeping it as a defence-in-depth fallback
   is negligible.
5. Drop the Slice C Case-C diagnostic
   `feature.fillet.continuity-not-applicable` from the "downgrade-with-warning"
   role. The audit shows the symbol is always present, so the code becomes
   reserved for a different recovery path: it should fire when a user passes
   `continuity: 'G2'` on a fillet whose adjacent faces are themselves only G1
   (e.g. fillet across a polyline edge of an extrusion), where requesting G2
   is geometrically meaningless. The hint should redirect to applying a
   smaller radius or a different blend strategy rather than implying the
   kernel can't do G2.
