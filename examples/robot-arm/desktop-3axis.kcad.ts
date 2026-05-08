// Desktop 3-axis robot arm — worked example.
//
// Demonstrates how to compose a fully-parametric multi-part mechanical
// assembly out of generic kernelCAD primitives + the assembly API. The
// kernel does NOT ship a robot-arm template; this example exists to show an
// agent how to build one (or any analogous multi-part artifact) from the
// lean generic toolset.
//
// Every dimension is a param() call. Connector origins, joint frames, and
// derived dimensions all participate in ParamRef arithmetic, so a single
// setParamValue('baseX', 90) re-lowers the entire assembly: the basePlate
// width grows, the connector frame at the plate center moves to match, and
// the dependent revolute joint relocates with it. Worked example for the
// agent-first parametric authoring story (kernelCAD v0.4.1+).

const baseX = param('baseX', 70);
const baseY = param('baseY', 46);
const plateThickness = param('plateThickness', 4);
const linkWidth = param('linkWidth', 18);
const pivotDiameter = param('pivotDiameter', 5);

const shoulderLength = param('shoulderLength', 72);
const elbowLength = param('elbowLength', 58);
const wristLength = param('wristLength', 34);

const screwSpacingX = param('screwSpacingX', 24);
const screwSpacingY = param('screwSpacingY', 12);
const screwDiameter = param('screwDiameter', 3);

// Derived dimensions stay symbolic via ParamRef arithmetic.
const screwHalfX = screwSpacingX.divide(2);
const screwHalfY = screwSpacingY.divide(2);
const wristWidth = linkWidth.multiply(0.85);
const toolWidth = linkWidth.multiply(0.7);
const toolLength = param('toolLength', 18);

// --- parts ----------------------------------------------------------------

const basePlate = box(baseX, baseY, plateThickness)
  .holes('top', {
    positions: [
      { u: screwHalfX.negate(), v: screwHalfY.negate() },
      { u: screwHalfX,          v: screwHalfY.negate() },
      { u: screwHalfX.negate(), v: screwHalfY          },
      { u: screwHalfX,          v: screwHalfY          },
    ],
    diameter: screwDiameter,
    depth: 'through',
    name: 'baseServoMounts',
  })
  .hole('top', {
    u: 0,
    v: 0,
    diameter: pivotDiameter,
    depth: 'through',
    name: 'basePivot',
  });

// linkPlate factory: a parametric link with two pivot holes.
//
// `pad` is the inset of the pivot from each end. The original design used
// `Math.max(width/2, pivotDiameter)` as a safety floor; under the realistic
// param ranges we actually run (linkWidth ≥ 16, pivotDiameter ≤ 6) the
// width-half always dominates, so we use width.divide(2) directly. If a
// future variant needs the floor back, lift it into its own `param('pad',
// ...)`. We skip it here to keep the example flow simple.
function linkPlate(length, width, thickness, holeName) {
  const halfL = length.divide(2);
  const pad = width.divide(2);
  return box(length, width, thickness).holes('top', {
    positions: [
      { u: halfL.subtract(pad).negate(), v: 0 },
      { u: halfL.subtract(pad),          v: 0 },
    ],
    diameter: pivotDiameter,
    depth: 'through',
    name: holeName,
  });
}

const shoulderLink = linkPlate(shoulderLength, linkWidth,  plateThickness, 'shoulderPivots');
const elbowLink    = linkPlate(elbowLength,    linkWidth,  plateThickness, 'elbowPivots');
const wristLink    = linkPlate(wristLength,    wristWidth, plateThickness, 'wristPivots');

const toolPlaceholder = union(
  box(toolLength, toolWidth, plateThickness),
  cylinder(plateThickness, pivotDiameter.divide(2).add(1)).translate(0, toolWidth.divide(2), 0),
);

// --- assembly -------------------------------------------------------------

const arm = assembly('desktop 3-axis robot arm');

const base = arm.part('base-plate', basePlate, {
  at: [0, 0, 0],
  connectors: {
    pivot: { origin: [baseX.divide(2), baseY.divide(2), plateThickness], axis: [0, 0, 1] },
  },
});

const shoulder = arm.part('shoulder-link', shoulderLink, {
  connectors: {
    root: { origin: [0,              linkWidth.divide(2), plateThickness.divide(2)], axis: [0, 1, 0] },
    tip:  { origin: [shoulderLength, linkWidth.divide(2), plateThickness.divide(2)], axis: [0, 1, 0] },
  },
  connect: { connector: 'root', to: base.connector('pivot'), name: 'base-to-shoulder' },
});

const elbow = arm.part('elbow-link', elbowLink, {
  connectors: {
    root: { origin: [0,           linkWidth.divide(2), plateThickness.divide(2)], axis: [0, 1, 0] },
    tip:  { origin: [elbowLength, linkWidth.divide(2), plateThickness.divide(2)], axis: [0, 1, 0] },
  },
  connect: { connector: 'root', to: shoulder.connector('tip'), name: 'shoulder-to-elbow' },
});

const wrist = arm.part('wrist-link', wristLink, {
  connectors: {
    root: { origin: [0,           wristWidth.divide(2), plateThickness.divide(2)], axis: [0, 1, 0] },
    tip:  { origin: [wristLength, wristWidth.divide(2), plateThickness.divide(2)], axis: [0, 1, 0] },
  },
  connect: { connector: 'root', to: elbow.connector('tip'), name: 'elbow-to-wrist' },
});

arm.part('tool-placeholder', toolPlaceholder, {
  connectors: {
    mount: { origin: [0, toolWidth.divide(2), plateThickness.divide(2)], axis: [0, 1, 0] },
  },
  connect: { connector: 'mount', to: wrist.connector('tip'), name: 'wrist-to-tool' },
});

// --- joints ---------------------------------------------------------------

// Joint origins are the parent connector's worldOrigin — passing the
// symbolic Vec3Param directly, so editing baseX/shoulderLength/etc.
// reactively moves the joint frames alongside the connector frames.

arm.revolute('base-yaw', base, shoulder, {
  axis: [0, 0, 1],
  origin: base.connector('pivot').worldOrigin,
  limitsDeg: [-120, 120],
});

arm.revolute('shoulder-pitch', shoulder, elbow, {
  axis: [0, 1, 0],
  origin: shoulder.connector('tip').worldOrigin,
  limitsDeg: [-45, 135],
});

arm.revolute('elbow-pitch', elbow, wrist, {
  axis: [0, 1, 0],
  origin: elbow.connector('tip').worldOrigin,
  limitsDeg: [-120, 120],
});

return arm.model();
