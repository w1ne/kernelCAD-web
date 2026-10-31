# Low-poly GLB export demo bundle

This bundle demonstrates the native kernelCAD GLB `style: 'lowpoly'` export of
the original parametric pine tree in `examples/assets/pine-tree.kcad.ts`, at its
defaults and at two parameter variants.

## Reproduce

From the repository root, with dependencies installed and ffmpeg available:

```sh
UPDATE_GLB_LOWPOLY_DEMO=1 npx vitest run tests/integration/kernel/export/glbLowPolyDemoCapture.test.ts --reporter=dot
node docs/demos/glb-lowpoly/generate-video.mjs
```

The first command exports each variant through `runAndExport` with
`{ format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: 400 } }` and checks
the actual GLB: one material (`kernelcad-palette`), metres, triangles within the
budget, the base on y = 0 and the height the knob asked for. Only with
`UPDATE_GLB_LOWPOLY_DEMO=1` does it write the three `pine-*.glb` files and
`verification.json` (byte hashes, stats and palette zones). The second command
renders the GLBs into `demo.mp4` and `poster.png`.

## What the files show

| Variant | Params | Triangles | Height |
|---|---|---|---|
| default | — | 96 | 4.5 m |
| tall-five-tiers | `heightM=8 tiers=5 sides=6` | 120 | 8 m |
| autumn-short | `heightM=3 tiers=2 sides=5 leaves=#c9772b` | 48 | 3 m |

## Provenance and scope

- Geometry is original kernelCAD source (`examples/assets/pine-tree.kcad.ts`):
  polygon-profile lofts and an extruded polygon trunk.
- No Polyfork downloads or meshes, no external meshes, and no mesh decimation
  are involved.
- The MP4 is a software render of the exported GLB triangles (node world
  matrices, `POSITION` and `COLOR_0` read with glTF-Transform, facet lighting,
  back-to-front SVG polygons). It is **not** a three.js render and not an
  engine import test (Unity, Godot and Unreal imports are unverified here).
- Local validation only: no deployed behaviour is claimed.

`pine-*.glb`, `demo.mp4`, `poster.png` and `verification.json` are generated
deliverables; the scripts named above retain the invocation and video settings.
