# Typical use case U6: spur gear pair

> Spur gear pair, module 1, 20 and 40 teeth, 20° pressure angle, 8 mm face
> width, 5 mm bores with a key flat, placed at the correct centre distance and
> meshing.

Pass criteria (the harness checks each one, ±0.1 mm):

- An assembly with two parts, `pinion` and `gear`, each one closed, valid
  solid, 8 mm thick (z = 0…8).
- Pinion: 20 teeth, tip Ø22, centred on the origin, a tooth on +X.
- Gear: 40 teeth, tip Ø42, centred at x = 30 (centre distance
  m·(z1 + z2)/2 = 30 mm), turned half a tooth so a gap faces the pinion.
- The teeth mesh: gear teeth reach inside the pinion's tip circle, and the
  two gears do not overlap anywhere.
- Each gear has a Ø5 bore with a key flat 0.5 mm deep on its +X side.
- STEP re-imports as two solids; STL is watertight.

End with `return <assembly>.model();`.
