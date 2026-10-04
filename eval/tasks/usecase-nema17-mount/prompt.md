# Typical use case U2: NEMA 17 motor mount

> L-bracket to mount a NEMA 17 stepper to a 2020 aluminium extrusion: motor
> face 42.3 mm square, 31 mm hole pattern M3, 22 mm pilot hole; base with two
> M5 slots for the extrusion; 5 mm thick; fillets on the bend.

Pass criteria (the harness checks each one, ±0.1 mm):

- One closed, valid solid. Base plate on z = 0…5, 50 mm along X (centred),
  45 mm along Y (y = 0…45). Motor plate at y = 0…5, standing up to z = 60,
  with a flat motor face at y = 0 and nothing in front of it (y < 0).
- Motor face covers the 42.3 mm square centred on the motor axis
  (x = 0, z = 30).
- Pilot hole Ø22 and four Ø3.4 holes on the 31 × 31 mm pattern, all through
  the motor plate along Y, centred on (x = 0, z = 30).
- Two M5 slots through the base, 5.5 mm wide, centres x = ±10, running
  y = 17…27 (centre to centre).
- A fillet (4 mm) fills the inside of the bend.
- `dfmSpec({ minWall: 1.2 })` passes; STEP, STL and 3MF export.

Return a single Shape.
