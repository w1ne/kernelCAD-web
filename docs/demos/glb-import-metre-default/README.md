# GLB import: an undeclared asset is metres, not a guessed extent

`lib.meshFromGLB` chose the source unit from the model size when an asset
declared no units: raw extent above 2 was treated as millimetres, anything
smaller as metres. glTF 2.0 already defines scene coordinates in metres, so a
valid 3 m beam imported as **3 mm**, and a valid 1.5 mm part imported as
**1.5 m**. The reader now follows the spec: extras win, else metres, and
`opts.units` still overrides both.

The same 1108-byte `beam.glb` (raw 3.0 x 0.2 x 0.2, no scene extras) measures
**3.00 x 0.20 x 0.20 mm** with the `origin/develop` reader and **3000 x 200 x
200 mm** with the fixed reader.

## Result

| | before (`origin/develop` c4a1e57dc) | after (this branch) |
|---|---|---|
| unit decision | extent 3 > 2, assumed millimetres | glTF default: metres |
| recorded unit | none | `units: m`, `unitScale: 1000`, `unitSource: gltf-default` |
| imported bbox | 3.00 x 0.20 x 0.20 mm | 3000 x 200 x 200 mm |
| triangle count | 12 | 12 |
| material group | `beam` | `beam` |

## Rules after the fix

- `asset.extras.kernelcad.units: 'mm' | 'm'` is authoritative when present.
- No declaration: raw coordinates are metres, as glTF 2.0 defines.
- `opts.units: 'mm' | 'm'` overrides both and still works.
- The decision is recorded on the shape metadata as `units`, `unitScale` and
  `unitSource` (`option`, `extras` or `gltf-default`), so a downstream check can
  see what was assumed instead of guessing from size.
- Millimetre-authored GLBs without extras must declare the unit or pass
  `{ units: 'mm' }`; they are no longer guessed from extent.

## Files

- `beam.glb`: the fixture, unchanged between the two measurements.
- `make-fixture.mjs`: writes the fixture (3 m beam, no extras).
- `measure.mjs`: decodes the fixture with the reader at a given module path and
  prints units, scale, source and the bounding box as JSON.
- `render.mjs`: draws `poster.svg` / `poster.png` / `before.png` / `after.png`
  from `verification.json`, then writes `demo.mp4`.
- `verification.json`: measured before/after numbers, commands, limits.
- `demo.mp4`, `poster.png`: the visual result.

## Reproduce

```sh
node docs/demos/glb-import-metre-default/make-fixture.mjs
npx tsx docs/demos/glb-import-metre-default/measure.mjs
npx tsx docs/demos/glb-import-metre-default/measure.mjs /path/to/develop/src/kernel/backends/glbMesh.ts
node docs/demos/glb-import-metre-default/render.mjs
npx vitest run tests/unit/kernel/glbMesh.test.ts --reporter=dot
```

The measured panels are local decoder results on identical bytes. They are not
a screenshot from a standard glTF viewer, a deployed-server check, or hardware
acceptance. The video is a fixed-view render of the measured numbers.
