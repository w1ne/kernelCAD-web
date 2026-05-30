# Task: Static-Load Capacity on a Cantilever Bracket

Build a cantilever bracket fastened to a wall and verify static-load
capacity in beam mode for two materials.

Functional requirements:

- A wall part (~40 mm cube) with a frame connector on its +X face at
  `[20, 0, 0]`.
- A cantilever bracket part shaped as a 200×50×5 mm box, translated `+100`
  in X so its back end sits at the wall's +X face. The part MUST declare a
  rectangular `crossSection: { kind: 'rectangle', widthMm: 50,
  heightMm: 5, lengthMm: 200 }` option so the closed-form beam path is
  applicable.
- A `fastened` mate joining the wall and cantilever via frame connectors.
- Steel run: call `kinematic.checkLoadCapacity` with `[0, 0, 50] N` tip
  load and `materials: { cantilever: { material: 'steel' } }`. Assert
  `ok: true` and `safetyFactor >= 4`.
- PLA run: call `kinematic.checkLoadCapacity` with a heavier `[0, 0, 500] N`
  tip load and `materials: { cantilever: { material: 'pla' } }`. Assert
  `ok: false` and `kinematic.load-exceeds-yield` (K6) diagnostic fires.
- Return `arm.solvedModel({})` so the harness's default interference gate
  stays clean.
