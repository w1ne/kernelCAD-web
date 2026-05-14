# Task: Blind hole + bottom-face fillet

Build a **100×60×5 mm** plate. Drill a **6 mm blind hole, depth 3 mm**, at (0, 0).
Apply a **0.2 mm fillet** to the floor of the hole using its created face ref.

Functional requirements:

- Plate: `box(100, 60, 5)`.
- One blind hole on top, centered, diameter 6 mm, depth 3 mm, named `pilotHole`.
- Fillet 0.2 mm on `pilotHole.floor`.
- No `feature.face-ref.*` errors. No `feature.created-ref.fallback-used` warning
  on this happy path (topology route should resolve directly).
