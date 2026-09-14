// diff_geometry example — a vented mount plate whose two design knobs change
// the part in two DIFFERENT ways, so one script demonstrates both readings
// the tool exists to separate:
//
//   boltDia 5 -> 7        widens the existing bolt holes. Same feature tree,
//                         less material, same bbox      -> verdict `resized`.
//   addCablePort -> false gates the cable cutout away. Same bbox, same outer
//                         size, one fewer feature  -> verdict `topology-changed`.
//
// Both edits remove-or-restore material without moving the part, so a single
// signed volume delta cannot tell you which kind of change happened. That is
// the ambiguity diff_geometry resolves: it reports added/removed/common
// volume from real OCCT booleans AND a topology reading, then names the
// verdict you branch on.
//
// Feature order matters here and is load-bearing: the cable cutout is applied
// BEFORE the bolt holes. Face-relative `{ u, v }` placement resolves against
// the face as it exists at that moment, so cutting the port after the holes
// would let a hole-diameter change shift the port by a fraction of a
// millimetre — real, but noise for this demonstration.
//
// Run with:
//   npx tsx -e "import('./src/agent/mcp/tools/diffGeometry').then(async ({ diffGeometryTool }) => { \
//     const baseFile = 'examples/diff-geometry/vented-mount-plate.kcad.ts'; \
//     for (const params of [{ boltDia: 7 }, { addCablePort: false }]) { \
//       const r = await diffGeometryTool({ baseFile, params }); \
//       if (!r.ok) { console.error('FAILED:', r.error); process.exitCode = 1; return; } \
//       for (const b of r.bodies) console.log(JSON.stringify(params), '->', b.verdict, \
//         'added=' + b.addedMm3.toFixed(3), 'removed=' + b.removedMm3.toFixed(3), \
//         'faces=' + b.faceCount.base + '->' + b.faceCount.revised, \
//         'edges=' + b.edgeCount.base + '->' + b.edgeCount.revised, \
//         'maxDev=' + b.maxDeviationMm.toFixed(3)); \
//     } })"
//
// Expected output — exactly two lines:
//   {"boltDia":7} -> resized added=0.000 removed=226.195 faces=12->12 edges=60->60 maxDev=0.997
//   {"addCablePort":false} -> topology-changed added=1296.000 removed=0.000 faces=12->8 edges=60->36 maxDev=2.000
//
// Every number is closed-form checkable, which is the point — this is
// measurement, not an impression of a picture:
//   removed 226.195 = 2 holes * pi/4 * (7^2 - 5^2) * 6 mm thickness
//   added   1296.000 = the 18 x 12 port footprint * 6 mm thickness
//   maxDev    0.997 ~= the 1 mm radial growth of each bolt hole
//   maxDev    2.000  = how deep the old port wall now sits inside solid
//                      material: the wall is tessellated into two triangle
//                      bands across the 6 mm thickness, so the deepest
//                      sampled point sits 2 mm from the restored face
//
// Evaluate the plate on its own with:
//   npx tsx src/agent/cli/index.ts evaluate examples/diff-geometry/vented-mount-plate.kcad.ts

const plateW = param('plateW', 80, { min: 40, max: 160, description: 'plate width (mm)' });
const plateD = param('plateD', 50, { min: 30, max: 120, description: 'plate depth (mm)' });
const plateT = param('plateT', 6, { min: 3, max: 20, description: 'plate thickness (mm)' });
const boltDia = param('boltDia', 5, { min: 3, max: 10, description: 'mounting-bolt hole diameter (mm)' });
const addCablePort = param('addCablePort', true, { description: 'include the cable pass-through cutout' });

return box(plateW, plateD, plateT)
  .cutout(
    path().moveTo(-9, -6).lineTo(9, -6).lineTo(9, 6).lineTo(-9, 6).close(),
    { face: 'top', depth: 'through', name: 'cablePort', enabled: addCablePort },
  )
  .holes('top', {
    positions: [{ u: -30, v: -18 }, { u: 30, v: -18 }],
    diameter: boltDia,
    depth: 'through',
    name: 'mountBolts',
  });
