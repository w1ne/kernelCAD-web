// rebuilt.kcad.ts with three params changed: length 80 -> 110, holes1Diameter 6.6 -> 10, filletRadius 5 -> 12.
// Reconstructed from source.step by mesh_to_features.
// Every dimension was measured from the mesh. Values snapped to a round
// number are listed, with the measured value, in the assumption ledger.
// Face queries pin the measured levels: change a height param and its
// atZ/atX/atY together.
// Measured fidelity vs the mesh: volume IoU 1.0000, max deviation 0.000 mm,
// RMS 0.000 mm — verdict faithful (thresholds: IoU >= 0.98, max dev <= 0.25 mm).

const length = param('length', 110, { min: 20, max: 320 }); // measured 79.9996
const width = param('width', 50, { min: 12.5, max: 200 }); // measured 49.9998
const thickness = param('thickness', 10, { min: 2.5, max: 40 });
const holes1Diameter = param('holes1Diameter', 10, { min: 1.65, max: 26.4 }); // measured 6.5997
const filletRadius = param('filletRadius', 12, { min: 1.25, max: 20 }); // measured 5.0008

// Block 1: rectangle profile (corner rounds are the fillet below), extruded z 0 → 10.
const body = path()
  .moveTo(0, 0)
  .lineTo(length, 0)
  .lineTo(length, width)
  .lineTo(0, width)
  .close()
  .extrude(thickness);

return body
  // holes1: 4 axial bores at (10, 8, 10) (70, 8, 10) (10, 42, 10) (70, 42, 10); u/v are from the entry face centroid.
  .holes({ byNormal: 'Z', atZ: 10 }, {
    positions: [
      { u: -30, v: -17 },
      { u: 30, v: -17 },
      { u: -30, v: 17 },
      { u: 30, v: 17 },
    ],
    diameter: holes1Diameter,
    depth: 'through',
    name: 'holes1',
  })
  // Constant-radius edge blends measured on the mesh: 4 edge(s) in 1 radius group(s).
  .fillet(filletRadius, { atZ: 5, convex: true, tolerance: 0.01 });
