# NURBS tube

Build a tubular wall from a cylindrical NURBS surface and thicken it into
a hollow tube.

- Outer radius (centerline of the NURBS surface): 5 mm.
- Length along Z: 40 mm.
- Wall thickness (thicken value): 1 mm.

Use `nurbsSurface(...)` with an explicit control net that wraps the
circumference. Because slice-1 ships non-rational surfaces only (rational
weights are accepted but ignored), use a polygonal approximation: 16
control points around the circumference (degree 1 in U), 2 control points
along the length (degree 1 in V). The first and last control rows must
coincide so the surface closes into a tube.

Constraints:
- Build with `nurbsSurface({ controls, degree: { u: 1, v: 1 } })`.
- `controls` is a 17-row × 2-column grid (last row repeats the first to close the loop).
- Chain `.thicken(1)` and return the resulting `Shape`.
