# Task: Mixed-Fastener Mounting Plate

Build a 100×100×10 mm mounting plate that carries two different fastener bore profiles in two pairs.

Functional requirements:

- Plate: 100×100×10 mm.
- Two **counterbored** holes (M6 fasteners) at face-local positions (-30, 0) and (30, 0). Bore Ø=6, counterbore Ø=11, counterbore depth=4. Through.
- Two **countersunk** holes (M4 fasteners) at face-local positions (0, -30) and (0, 30). Bore Ø=4, countersink Ø=8, default countersink angle. Through.
- Use chained `.hole()` calls (one per fastener position) — slice 1 does not yet support mixed cb/csk specs in a single batched `holes()` call.

Return the resulting plate.

Z-up, millimetres, degrees.
