# Typical use case U1: sensor wall bracket

> Wall-mount bracket for a 30 mm diameter cylindrical sensor. Clamp ring with a
> slot and an M3 clamp screw; back plate 50×40×4 mm with two M4 countersunk
> holes 30 mm apart. PLA print.

Pass criteria (the harness checks each one, ±0.1 mm):

- One closed, valid solid. The back plate lies in X/Y with its front face at
  z = 0 and its back at z = −4, centred on the origin: 50 mm along X, 40 mm
  along Y (y = −20…20).
- Clamp bore Ø30.2 mm (0.2 mm clearance) along Z, centred at x = 0, y = 6; the
  ring is 20 mm tall and open at the top (+Y) by a slot. Nothing intrudes on
  the bore.
- Two M4 countersunk holes, Ø4.5 mm, 90° countersink to Ø8.96 mm, at
  (±15, −14), through the plate.
- M3 clamp screw hole Ø3.4 mm along X through both clamp ears, at y = 27.1,
  z = 10.
- `dfmSpec({ minWall: 1.2 })` passes.
- STEP re-imports as one solid, STL is watertight, 3MF has the part.

Return a single Shape.
