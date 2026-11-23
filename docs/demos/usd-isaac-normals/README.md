# usd-isaac export: link meshes keep sharp edges sharp

`format: 'usd-isaac'` writes one `meshes/<link>.usda` mesh layer per link.
The layers had no normals. The export mesher shares vertices across B-rep
face boundaries, so a reader that computes smooth normals averages them
across every sharp edge. In three.js `USDLoader` a box corner gets a normal
with largest component 0.667, and the base block of the demo arm shades as a
dented pyramid. Other readers (Hydra Storm, Isaac Sim) were not checked here.

Each mesh layer now authors `primvars:normals` with
`interpolation = "faceVarying"` and `primvars:normals:indices`. It uses the
same 30° crease split as the `usd` and `ply` writers (`usdNormals` in
`src/kernel/export/meshFormats.ts`). The metadata is on its own lines: the
three.js USDA parser drops the normals array when `(interpolation = ...)`
follows it on the same line. Points, `faceVertexIndices` and the root stage
`arm.usda` do not change.

## Files

- `arm.kcad.ts`: two-link arm. The base is a sharp-edged block with a
  through bore; link1 has filleted long edges.
- `render-video.mjs`: loads `meshes/base.usda` and `meshes/link1.usda` from
  `before/` and `after/` side by side in headless Chromium with three.js
  `USDLoader` and writes `demo.mp4`, `poster.png` and `loader-stats.json`.
- `verification.json`: sizes and hashes of the six USDA files and the loader
  counts. The USDA files (4.0 MB) are not committed.

## Reproduce

Export `arm.kcad.ts` with `runAndExport({ format: 'usd-isaac' })` from a
vitest file (tsx cannot load OCCT locally) on `origin/develop` into
`before/` and on this branch into `after/`: write `bytes` to `arm.usda` and
each `meshes[].bytes` to its `relPath`. Then run:

```sh
node docs/demos/usd-isaac-normals/render-video.mjs
```

## Result

| | before (develop) | after (this branch) |
|---|---|---|
| meshes loaded | 2 | 2 |
| triangle corners | 106116 | 106116 |
| base corners with a face-axis normal (of 3072) | 36 | 1584 |
| `meshes/base.usda` bytes | 33788 | 56643 |
| `meshes/link1.usda` bytes | 1328300 | 2554593 |

In `demo.mp4` (6 s) the base block on the left shades as a dented pyramid and
the bore does not show. On the right the base has flat faces, sharp edges and
a visible bore. The filleted link1 shades smooth in both, as it should.
The mesh layers grow by 68% (base) and 92% (link1) as ASCII text: one normal
index per face vertex.
