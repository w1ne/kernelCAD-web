# GLB export: sharp edges stay sharp

The default GLB export (`style: 'pbr'`) wrote normals averaged across sharp
B-rep edges. `meshShapeForExport` shares vertices across face boundaries, and
the writer then called three's `computeVertexNormals()`, so each vertex on a
90° edge got the mean of both faces. Viewers shaded every hard edge as a soft
bulge. The writer now uses `creasedNormalMesh`
(`src/kernel/export/creasedNormals.ts`): a vertex is split where its triangles
meet at more than 30°, and normals are area-weighted only across smoother joins.

## Files

- `bracket.kcad.ts`: the demo part (filleted block, through bore, boss).
- `before.glb`: exported from `origin/develop` 91075619e.
- `after.glb`: exported from this branch.
- `render-video.mjs`: renders both files side by side in headless Chromium
  with three.js `GLTFLoader`, which shades with the file's `NORMAL` attribute.
- `demo.mp4`, `poster.png`: the render output (6 s, one full turn).
- `verification.json`: the measured accessor counts and hashes.

## Reproduce

Export `bracket.kcad.ts` with `runAndExport({ format: 'glb' })` on each
revision (a vitest file is needed because tsx cannot load OCCT locally), save
the bytes as `before.glb` and `after.glb`, then run:

```sh
node docs/demos/glb-creased-normals/render-video.mjs
```

## Scope

This is a local export and a standard three.js render. It does not cover the
Studio viewer, which builds its own preview mesh.
