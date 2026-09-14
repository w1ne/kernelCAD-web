// Reconstructed from end-stop.stl by mesh_to_features.
// Every dimension was measured from the mesh. Values snapped to a round
// number are listed, with the measured value, in the assumption ledger.
// Face queries pin the measured levels: change a height param and its
// atZ/atX/atY together.
// Measured fidelity vs the mesh: volume IoU 1.0000, max deviation 0.000 mm,
// RMS 0.000 mm — verdict faithful (thresholds: IoU >= 0.98, max dev <= 0.25 mm).

const thickness = param('thickness', 12, { min: 3, max: 48 });
const width = param('width', 60, { min: 15, max: 240 }); // measured 59.9992
const length = param('length', 40, { min: 10, max: 160 }); // measured 40.0022
const holes1Diameter = param('holes1Diameter', 5.5, { min: 1.375, max: 22 }); // measured 5.4998
const fillet1Radius = param('fillet1Radius', 5, { min: 1.25, max: 20 }); // measured 5.0008
const fillet2Radius = param('fillet2Radius', 2, { min: 0.5, max: 8 }); // measured 2.0004

// Block 1: extruded profile, z 0 → 12.
const body = path()
  .moveTo(0, 0)
  .lineTo(width, 0)
  .lineTo(width, length)
  .lineTo(0, length)
  .close()
  .extrude(thickness);

return body
  // holes1: 2 axial bores at (20, 10, 12) (20, 30, 12); u/v are from the entry face centroid.
  .holes({ byNormal: 'Z', atZ: 12 }, {
    positions: [
      { u: -10, v: -10 },
      { u: -10, v: 10 },
    ],
    diameter: holes1Diameter,
    depth: 'through',
    name: 'holes1',
  })
  // Constant-radius edge blends measured on the mesh: 3 edge(s) in 2 radius group(s).
  .fillet([
    { edges: { atX: 0, parallel: [0, 0, 1], tolerance: 0.01 }, radius: fillet1Radius },
    { edges: { atZ: 12, atX: 60, tolerance: 0.01 }, radius: fillet2Radius },
  ]);
