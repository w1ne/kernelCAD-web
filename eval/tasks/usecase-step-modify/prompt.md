# Typical use case U15: modify an imported STEP

> Here is a STEP file of a part; add two 5 mm holes 20 mm apart through the
> top face.

The STEP file is `input.step`, next to your script (the harness writes it
there: the U2 NEMA 17 mount, base plate on z = 0…5, y = 0…45, motor plate at
y = 0…5 up to z = 60). Import it with `lib.fromSTEP('input.step')`. The top
face is the base plate's upper face (z = 5); put the holes on its free area
at y = 35, centred on x = 0.

Pass criteria (the harness checks each one, ±0.1 mm):

- One closed, valid solid with the imported part's bounding box.
- Two new Ø5 holes along Z through the base plate at (±10, 35), 20 mm apart.
- Nothing else changed: the original motor holes are still there, and the
  volume is the imported volume minus the two holes.
- STEP re-imports as one solid; STL is watertight.

Return a single Shape.
