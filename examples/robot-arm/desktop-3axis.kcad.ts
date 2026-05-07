// Intent-level desktop 3-axis robot arm kit.
//
// This is the first vertical mechanical workflow: one intent object generates
// named parts, validation metadata, an assembly manifest, revolute joint
// records, and one fused/exportable static model.

const intent = {
  name: 'desktop 3-axis robot arm kit',
  linkLengths: [72, 58, 34],
  plateThickness: 4,
  linkWidth: 18,
  pivotDiameter: 5,
  clearance: 1,
  screwPattern: { x: 24, y: 12, diameter: 3 },
  jointLimitsDeg: {
    base: [-120, 120],
    shoulder: [-45, 135],
    elbow: [-120, 120],
    wrist: [-90, 90],
  },
};

const kit = robotArmKit(intent);
const manifest = kit.manifest();

void manifest;

return kit.model();
