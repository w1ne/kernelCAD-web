# Export a flat sheet-metal blank to DXF

Build a 50 x 25 mm rectangular sheet-metal blank, `1.5 mm` thick, with `kFactor = 0.4`. Return the bent body produced by a single 90 degree fold along the midline `x = 25`, radius `1 mm`.

The eval harness exports the returned shape to DXF and checks the writer contract:

- the `cut` layer carries one closed polyline matching the original rectangle within the chord tolerance,
- the `BEND` layer is present (may be empty),
- the file uses `LWPOLYLINE` entities only (no `SPLINE`),
- `$INSUNITS` is `4` (mm).

End the script with `return blank.bend({ atX: 25 }, 90, 1);` (or equivalent). The runtime walks the lineage back to the `sheetMetal` root and emits the flat-pattern DXF without an explicit `.flattenPattern()` call.
