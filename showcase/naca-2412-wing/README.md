# NACA 2412 tapered wing

> NACA 2412 wing: true airfoil from the NACA equations, tapered loft.

The section comes from the NACA 4-digit equations: 2 % camber at 40 % chord and 12 % thickness, with thickness applied perpendicular to the mean camber line and cosine-spaced points. Six spanwise sections are lofted, and the chord tapers from `rootChord` (200 mm) to `tipChord` (100 mm). Leading-edge sweep, dihedral, and a 2° nose-down washout about the quarter chord are params too. The yellow root rib is the root section itself, extruded 4 mm, so the cambered airfoil shows whenever the root faces the camera. Every section point is `chord × (x, y)` in ParamRef arithmetic, so all six params (`semiSpan`, `rootChord`, `tipChord`, `leSweep`, `dihedralRise`, `washoutDeg`) rebuild the loft. One wing panel is shown. Checked with `kernelcad evaluate` (clean) and the 7-view sheet; the front tile shows the airfoil. Source: [`naca-2412-wing.kcad.ts`](naca-2412-wing.kcad.ts).
