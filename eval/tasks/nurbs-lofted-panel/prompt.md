# NURBS lofted panel

Build a smooth free-form panel by skinning three parallel cross-sections
spaced 10 mm apart along Z (planes at z = 0, 10, 20). Each cross-section
is a closed rectangle in the XY plane with varying width along the stack:

- z = 0:  60 mm × 20 mm centered on the origin (x in [-30, 30], y in [-10, 10])
- z = 10: 60 mm × 30 mm (y in [-15, 15])  — bulges wider
- z = 20: 60 mm × 10 mm (y in [-5, 5])   — tapers narrower

Skin a NURBS surface through these sections via `surfaceFromCurves`, then
thicken the resulting surface by 2 mm to produce a solid panel. Return the
thickened solid.

Constraints:
- Build each section with `path().moveTo(...).lineTo(...).close()`.
- Use `surfaceFromCurves([s0, s1, s2])` (declaration order = skin direction).
- Chain `.thicken(2)` on the returned `Surface`.
- Return the resulting `Shape`.
