# Typical use case U14: edit an existing design

Start from the U1 sensor wall bracket
(`eval/tasks/usecase-sensor-bracket/solution-expert.kcad.ts`). The user asks
for a follow-up change:

> Make the back plate 10 mm taller, move the holes accordingly and add a 45°
> chamfer on the front edges.

Pass criteria (the harness checks each one, ±0.1 mm):

- One closed, valid solid.
- The back plate is 50 × 50 mm (y = −25…25), still 4 mm thick (z = −4…0).
- The two M4 countersunk holes keep their 6 mm to the bottom edge: Ø4.5 at
  (±15, −19), still 30 mm apart and countersunk.
- A 45° chamfer (1 mm) runs along the plate's front-face edges (z = 0) and not
  along its back edges (z = −4).
- Nothing else changed: the clamp ring, slot, ears, bore and clamp screw hole
  are identical to U1 (same holes, same material above the plate).
- `dfmSpec({ minWall: 1.2 })` passes; STEP, STL and 3MF export.

Return a single Shape.
