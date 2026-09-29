# Typical use case U3: Raspberry Pi 4 enclosure

> Two-part enclosure for a Raspberry Pi 4 Model B: standoffs on the board's
> M2.5 mounting holes (58×49 mm pattern), cutouts for USB-C, 2× micro-HDMI,
> audio, 2× USB + Ethernet, SD card slot; vent slots on the lid; lid attaches
> with 4 screws or snap fits; 2 mm walls.

Use the real board: 85 × 56 mm, holes at (3.5, 3.5), (61.5, 3.5),
(3.5, 52.5), (61.5, 52.5); along the y = 0 edge USB-C at x = 11.2,
micro-HDMI at 26 and 39.5, audio at 54; along the x = 85 edge USB at
y = 9 and 27, Ethernet at 45.75; micro-SD under the board at the x = 0 edge,
y = 28. Place the board with its origin at (3.5, 3.5) inside the enclosure,
bottom at z = 7 (2 mm floor + 5 mm standoffs), 1.5 mm thick.

Pass criteria (the harness checks each one, ±0.1 mm):

- An assembly with parts `base` and `lid`, each one closed, valid solid, in
  the assembled position; they do not overlap.
- Base 92 × 63 × 27 mm from the origin, 2 mm walls and floor; the lid closes
  the top (z = 27…29).
- Four standoffs on the 58 × 49 mm pattern (x = 7, 65; y = 7, 56), tops at
  z = 7, each with an M2.5 pilot hole.
- Four M2.5 screw paths through the lid, coaxial with the standoffs.
- Open cutouts for USB-C, both micro-HDMI and audio (y = 0 wall), both USB
  pairs and Ethernet (x = 92 wall), and the micro-SD slot (x = 0 wall, under
  the board).
- Vent slots through the lid over the board.
- `dfmSpec({ minWall: 1.2 })` passes; `evaluate_script` (mechanism gate on)
  accepts the two parts; STEP re-imports as two solids; each part's STL is
  watertight; the 3MF lays both parts flat on the plate without overlap.

End with `return <assembly>.model();`.
