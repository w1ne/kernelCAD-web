# USD export: loads in three.js, sharp edges stay sharp

`format: 'usd'` had two viewer faults.

1. The three.js `USDLoader` found **0 meshes** in a kernelCAD stage. Its USDA
   parser does not read prim children when the opening brace is on the same
   line as `def Xform "Model" {`. The writer now puts each brace on its own
   line, as `usdcat` does.
2. The stage had no normals. The export mesher shares vertices across B-rep
   face boundaries, so a reader that computes smooth normals (three.js does;
   other readers were not checked) averages them across every sharp edge: a box corner gets (±0.58, ±0.58, ±0.58), a bore shades as a dome and
   flat faces show streaks. The writer now authors `primvars:normals` with
   `interpolation = "faceVarying"` and `primvars:normals:indices`. The normals
   are split where faces meet at more than 30° (the PLY writer's existing
   crease split, moved to `src/kernel/export/creaseSplit.ts`). Points and
   `faceVertexIndices` are unchanged.

## Files

- `bracket.kcad.ts`: the demo part (filleted block, through bore, boss).
- `render-video.mjs`: loads three USDA files side by side in headless Chromium
  with three.js `USDLoader` and writes `demo.mp4`, `poster.png` and
  `loader-stats.json`.
- `verification.json`: sizes, hashes and loader counts of the three files.
  The USDA files (7.7 MB) are not committed.

## Reproduce

Export `bracket.kcad.ts` with `runAndExport({ format: 'usd' })` on
`origin/develop` (`before.usda`) and on this branch (`after.usda`) from a
vitest file (tsx cannot load OCCT locally). Make `braces-only.usda` from
`before.usda` by moving the `def Xform "Model" {` and
`def Scope "Materials" {` braces to the next line. Put the three files in this
folder and run:

```sh
node docs/demos/usd-viewer-normals/render-video.mjs
```

## Result

| File | Meshes loaded | Shading |
| --- | --- | --- |
| before (develop) | 0 | nothing drawn |
| braces only | 1 | top face streaked, bore shades as a dome, boss streaked |
| after | 1 | flat faces flat, bore and boss crisp, fillets smooth |

The ASCII file grows 71% on this part (2,094,374 to 3,588,532 bytes).

## Scope

Checked with the three.js reader only. usdview, Omniverse and Apple Quick Look
were not run here. The `usd-isaac` link mesh layers use a separate serializer
and are not changed.
