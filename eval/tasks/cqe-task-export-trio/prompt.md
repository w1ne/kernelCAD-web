# Export Trio Round-Trip

Build a small two-part assembly that the runtime can ship to STL, 3MF, and
GLB, and whose plate component can also be flattened to DXF.

## Parts

1. A 50 × 30 × 1.5 mm sheet-metal base **plate**, painted with the `plate`
   color token.
2. A 20 × 10 × 5 mm solid **bracket** centred on top of the plate at
   `(15, 10, 1.5)`, painted with the `frame` color token.

## Output

End the script with `return <assembly>.model();` so the runtime walks the
returned `Scene` through `sceneToWorldFrameParts` for every multi-body
format.

## What the eval gates

- The script `evaluate`s cleanly (no error diagnostics).
- The assembly exports to **STL** as a non-empty binary mesh.
- The plate's `flattenPattern()` exports to **DXF** as `LWPOLYLINE`
  geometry on the `cut` layer (the harness re-builds the plate-only
  flatten source inline; the original script does not need to expose it).
- The assembly exports to **3MF** with two `<object>` entries named
  `plate` and `bracket`.
- The assembly exports to **GLB** with two glTF nodes named `plate` and
  `bracket`.

The harness exercises the full `export_model` matrix in a single eval
run, so a regression in any of the four writer paths surfaces here.
