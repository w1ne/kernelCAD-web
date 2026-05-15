# Pocket-watch visual gates — final pass (v5)

Source: `build.kcad.ts` (Features: 323, OK; interference: 0 pairs / 96 parts).

| Gate | Pass? | Evidence (from which render?) |
|------|-------|------------------------------|
| G1 — NURBS crystal spans the dial (>= 80% of dial radius) | yes | front.png, iso.png, top.png — `DOME_HALF = DIAL_RADIUS * 0.83` = 9.96 mm; ratio = 83% of the 12 mm dial radius. Dome footprint clearly covers the central majority of the teal dial. |
| G2 — Pink frame visible on BOTH front and back faces of yellow case | yes | front.png + iso.png + right.png. `FRAME_DEPTH = 9.0` vs `CASE_DEPTH = 8.0`; case (Y ∈ [-4, +4]) is fully enveloped by frame (Y ∈ [-4.5, +4.5]). Right view shows pure pink silhouette with no yellow case poking out; iso shows pink frame around the case octagon both at the visible front-facing depth and along the side band. |
| G3 — Crystal reads as a DOME (curvature visible), not a flat slab | yes | iso.png, right.png, top.png — right view shows a clean lens/dome silhouette protruding from the case in -Y; top view shows the dome bubble below the case projected sideways; iso shows curvature shading. Periodic-V NURBS removed the angular seam wedge from earlier iterations. |
| G4 — Numerals 12, 6, 9 readable on dial (not buried by crystal) | yes | front.png — numerals sit on the teal annular ring OUTSIDE the dome rim (NUMERAL_RADIUS ≈ 11.16 mm > DOME_HALF 9.96 mm). All three glyphs ("12" top, "6" bottom, "9" left) visible against the teal dial without crystal occlusion. |
| G5 — All 8 hex screws visible at octagon vertices | yes | front.png — eight black hexagonal screw heads visible at all eight bezel-octagon vertices. |
| G6 — Front view reads instantly as a "pocket watch" matching the reference photo | yes | front.png — pink octagonal frame, yellow octagonal case, teal dial with numerals, central dome crystal, bow + crown at top. Matches the Swatch×AP reference's silhouette and color palette. |
| G7 — Zero BREP interferences | yes | `kernelcad interference build.kcad.ts` reports: "No interferences detected (96 parts, 260 comparisons, ε=0.01mm³)." |

## Iteration log

1. **v1** — DOME_HALF = DIAL_RADIUS+0.8, square 5×5 control grid. Result: dome rendered as a square slab; G3 failed.
2. **v2** — Switched to polar control grid (radial × angular). Result: dome was circular but had a visible seam wedge at angle = 0; G3 failed.
3. **v3** — Increased angular resolution to N=12. Result: seam wedge smaller but still visible; G3 failed.
4. **v4** — Added explicit `periodic: { u: false, v: true }` with periodic V knot vector `[0..N_ANGULAR]`. Result: seam closed, smooth dome; G1/G3/G5/G6/G7 pass but numerals occluded by opaque dome; G4 failed.
5. **v5 (final)** — Shrunk `DOME_HALF` to 0.83 × DIAL_RADIUS (still ≥80% gate) and moved numerals to `NUMERAL_RADIUS = DOME_HALF + NUMERAL_SIZE*0.6` so they sit just OUTSIDE the dome rim on the visible teal annulus. All gates pass.
