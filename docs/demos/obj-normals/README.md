# OBJ export: round faces shade smooth, sharp edges stay sharp

`format: 'obj'` wrote `v` and `f` lines but no `vn` normals. Readers then
make their own normals. three.js `OBJLoader`
shades every triangle flat, so a cylinder side shows facet bands. Readers
that average normals over shared vertices would round every sharp CAD edge
instead. Other readers were not checked here.

Each OBJ object now writes distinct `vn` lines and `f v//vn` faces. The
normals use the same 30° crease split as the `usd` and `ply` writers
(`creaseNormals` in `src/kernel/export/meshFormats.ts`). `v` lines, vertex
indices, object names and materials do not change.

## Files

- `part.kcad.ts`: plate with rounded vertical edges, a round boss and a
  through bore.
- `render-video.mjs`: loads `before/model.obj` and `after/model.obj` side by
  side in headless Chromium with three.js `OBJLoader` and writes `demo.mp4`,
  `poster.png` and `loader-stats.json`.
- `poster-zoom.png`: the boss from `poster.png`, magnified 3x (left: before,
  right: after).
- `verification.json`: sizes and hashes of the two OBJ files, which are not
  committed, and a cylinder probe.

## Reproduce

Export `part.kcad.ts` with `runAndExport({ format: 'obj' })` from a vitest
file (tsx cannot load OCCT locally) on `origin/develop` into `before/` and
on this branch into `after/`. Unzip `model.obj` and `model.mtl`. Then run:

```sh
node docs/demos/obj-normals/render-video.mjs
```

## Result

| | before (develop) | after (this branch) |
|---|---|---|
| triangles loaded | 3040 | 3040 |
| `v` lines | 1520 | 1520 |
| `vn` lines | 0 | 659 |
| triangles with one flat non-axial normal | 1464 | 0 |
| `model.obj` bytes | 109030 | 166387 |
| `cylinder(10, 20)` side triangles shaded flat | 504 of 504 | 0 of 504 |
| `cylinder(10, 20)` mean side normal deviation from radial | 0.714° | 0.165° |

At full frame in `demo.mp4` (6 s) the difference is small at this
tessellation. In `poster-zoom.png` the left boss shows vertical facet
bands and the right boss shades as one continuous gradient. The plate faces
and the sharp top and bottom edges look the same in both panels. The OBJ
file grows by 53%.
