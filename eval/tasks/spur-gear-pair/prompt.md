# Task: Meshing Involute Spur Gear Pair

Model a pair of meshing involute spur gears as an assembly.

Gears:

- **Module** 1.5 mm, **pressure angle** 20°, **face width** 8 mm.
- **Pinion**: 18 teeth, 6 mm through-bore.
- **Gear**: 36 teeth, 10 mm through-bore.
- Both gears are coaxial with world Z and sit on z = 0 (faces from z = 0 to
  z = 8).

Placement:

- The pinion is centred on the world origin.
- The gear is on +X at the standard centre distance m(z1 + z2)/2, turned so
  its teeth mesh with the pinion's (a tooth space facing each pinion tooth
  at the line of centres).

Success criteria:

- Each gear is ONE connected, watertight solid (no floating teeth, no hollow
  ring).
- The two gears do not interpenetrate at the nominal centre distance.
- Real involute tooth flanks, not trapezoids.

Return an `assembly(...)` with parts named `pinion` and `gear`
(`return pair.model()`).

Z-up, millimetres, degrees.
