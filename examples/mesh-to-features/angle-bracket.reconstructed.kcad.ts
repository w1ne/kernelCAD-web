// Reconstructed from angle-bracket.stl by mesh_to_features.
// Every dimension was measured from the mesh. Values snapped to a round
// number are listed, with the measured value, in the assumption ledger.
// Face queries pin the measured levels: change a height param and its
// atZ/atX/atY together.
// Measured fidelity vs the mesh: volume IoU 1.0000, max deviation 0.001 mm,
// RMS 0.000 mm — verdict faithful (thresholds: IoU >= 0.98, max dev <= 0.25 mm).

const height = param('height', 30, { min: 7.5, max: 120 });
const crossHole1Diameter = param('crossHole1Diameter', 6.5, { min: 1.625, max: 26 }); // measured 6.5
const crossHole1Depth = param('crossHole1Depth', 6, { min: 1.5, max: 24 });
const crossHole2Diameter = param('crossHole2Diameter', 6.5, { min: 1.625, max: 26 }); // measured 6.5
const crossHole2Depth = param('crossHole2Depth', 6, { min: 1.5, max: 24 });
const crossHole2CounterboreDiameter = param('crossHole2CounterboreDiameter', 11, { min: 2.75, max: 44 }); // measured 11
const crossHole2CounterboreDepth = param('crossHole2CounterboreDepth', 3, { min: 0.75, max: 12 }); // measured 3.01

// Block 1: extruded profile, z 0 → 30.
const body = path()
  .moveTo(0, 0)
  .lineTo(60, 0)
  .lineTo(60, 6)
  .lineTo(12, 6)
  .threePointsArc(6, 12, 7.757, 7.757)
  .lineTo(6, 45)
  .lineTo(0, 45)
  .close()
  .extrude(height);

return body
  // crossHole1: cross (X) bore at (6, 30, 15); u/v are from the entry face centroid.
  .hole({ byNormal: 'X', atX: 6 }, {
    u: 1.5,
    v: 0,
    diameter: crossHole1Diameter,
    depth: crossHole1Depth,
    name: 'crossHole1',
  })
  // crossHole2: cross (Y) bore at (40, 6, 15); u/v are from the entry face centroid.
  .hole({ byNormal: 'Y', atY: 6 }, {
    u: 4,
    v: 0,
    diameter: crossHole2Diameter,
    depth: crossHole2Depth,
    counterbore: { diameter: crossHole2CounterboreDiameter, depth: crossHole2CounterboreDepth },
    name: 'crossHole2',
  });
