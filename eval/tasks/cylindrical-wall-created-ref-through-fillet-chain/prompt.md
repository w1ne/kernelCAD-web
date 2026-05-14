# Task: Created-ref survives a fillet chain

Build a **100×60×20 mm** block. Drill a 6 mm through-hole at (0, 0). Fillet the top
rim of the hole at 0.3 mm. Fillet the body's outer top edges at 1 mm. Then fillet
the bore's cylindrical wall at 0.2 mm — addressing it as `thruHole.wall`.

Functional requirements:

- The bore wall fillet must succeed without any `feature.face-ref.removed` error.
- It is acceptable to emit one `feature.created-ref.fallback-used` warning (proves
  the fallback works); a clean topology-route hit is also acceptable.
