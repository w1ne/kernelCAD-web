# Molded enclosure half

Build the lower half of a small molded enclosure as a single watertight solid,
then add a mounting boss.

The enclosure is a rectangular box, open-modeled from flat NURBS patches and
sewn into a closed solid:

- Footprint: 40 mm (X) × 30 mm (Y).
- Height: 20 mm (Z), with the floor at z = 0.
- A cylindrical mounting boss of radius 5 mm stands centered on the top face.

Constraints:

- Author the six box walls as planar `nurbsSurface(...)` patches (degree 1 in
  both U and V — flat quads). Adjacent patches must share geometrically
  identical boundary edges so they sew watertight.
- Build the front wall OVERSIZED (overhanging below the floor) and trim it back
  to the z = 0 parting plane with `trimTo(...)`. Surface trim runs on planar
  patches only.
- Stitch the patches with `sew([...], { requireClosed: true })` so the result
  is a genuinely closed solid, not an open shell.
- Add the boss as an exact-radius cylinder (`extrudeCircle(5, ...)`) centered at
  (20, 15) on the top face, penetrating a couple of millimeters into the box so
  the union fuses cleanly. Union it onto the sewn shell.
- Return the watertight result. It must export to STEP.
