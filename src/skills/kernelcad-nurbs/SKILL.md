---
name: kernelcad-nurbs
description: NURBS surfaces — nurbsSurface(), surfaceFromCurves(), .thicken(), .toShape(). Use for freeform curved surfaces that primitives + sketches cannot express.
---

# kernelCAD — NURBS surfaces

Build free-form panels and lofted shells whose result enters the existing Shape pipeline (booleans, fillets, exports).

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

## Related skills

- `kernelcad-authoring` — primitives + sketches still cover most shapes; reach for NURBS only when the freeform contour can't be expressed.
- `kernelcad-features` — `.thicken(t)` returns a Shape that participates in all standard booleans and face/edge features.
- `kernelcad-from-reference` — when matching a domed/curved real object (lens, dial, dome).
