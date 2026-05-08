// Desktop 3-axis robot arm — worked example.
//
// Demonstrates how to compose a multi-part mechanical assembly out of
// generic kernelCAD primitives + the assembly API. The kernel does NOT
// ship a robot-arm template; this example exists to show an agent how to
// build one (or any analogous multi-part artifact) from the lean
// generic toolset.

const baseX = 70;
const baseY = 46;
const plateThickness = 4;
const linkWidth = 18;
const pivotDiameter = 5;

const shoulderLength = 72;
const elbowLength = 58;
const wristLength = 34;

const screwSpacingX = 24;
const screwSpacingY = 12;
const screwDiameter = 3;

// --- parts ----------------------------------------------------------------

const basePlate = box(baseX, baseY, plateThickness)
  .holes('top', {
    positions: [
      { u: -screwSpacingX / 2, v: -screwSpacingY / 2 },
      { u: screwSpacingX / 2, v: -screwSpacingY / 2 },
      { u: -screwSpacingX / 2, v: screwSpacingY / 2 },
      { u: screwSpacingX / 2, v: screwSpacingY / 2 },
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

function linkPlate(length, width, thickness, holeName) {
  const pad = Math.max(width / 2, pivotDiameter);
  return box(length, width, thickness).holes('top', {
    positions: [
      { u: -length / 2 + pad, v: 0 },
      { u: length / 2 - pad, v: 0 },
    ],
    diameter: pivotDiameter,
    depth: 'through',
    name: holeName,
  });
}

const shoulderLink = linkPlate(shoulderLength, linkWidth, plateThickness, 'shoulderPivots');
const elbowLink = linkPlate(elbowLength, linkWidth, plateThickness, 'elbowPivots');
const wristWidth = linkWidth * 0.85;
const wristLink = linkPlate(wristLength, wristWidth, plateThickness, 'wristPivots');

const toolWidth = linkWidth * 0.7;
const toolPlaceholder = union(
  box(Math.max(18, wristLength * 0.45), toolWidth, plateThickness),
  cylinder(plateThickness, pivotDiameter / 2 + 1).translate(0, toolWidth / 2, 0),
);

// --- assembly -------------------------------------------------------------

const arm = assembly('desktop 3-axis robot arm');

const base = arm.part('base-plate', basePlate, {
  at: [0, 0, 0],
  connectors: {
    pivot: { origin: [baseX / 2, baseY / 2, plateThickness], axis: [0, 0, 1] },
  },
});

const shoulder = arm.part('shoulder-link', shoulderLink, {
  connectors: {
    root: { origin: [0, linkWidth / 2, plateThickness / 2], axis: [0, 1, 0] },
    tip: { origin: [shoulderLength, linkWidth / 2, plateThickness / 2], axis: [0, 1, 0] },
  },
  connect: { connector: 'root', to: base.connector('pivot'), name: 'base-to-shoulder' },
});

const elbow = arm.part('elbow-link', elbowLink, {
  connectors: {
    root: { origin: [0, linkWidth / 2, plateThickness / 2], axis: [0, 1, 0] },
    tip: { origin: [elbowLength, linkWidth / 2, plateThickness / 2], axis: [0, 1, 0] },
  },
  connect: { connector: 'root', to: shoulder.connector('tip'), name: 'shoulder-to-elbow' },
});

const wrist = arm.part('wrist-link', wristLink, {
  connectors: {
    root: { origin: [0, wristWidth / 2, plateThickness / 2], axis: [0, 1, 0] },
    tip: { origin: [wristLength, wristWidth / 2, plateThickness / 2], axis: [0, 1, 0] },
  },
  connect: { connector: 'root', to: elbow.connector('tip'), name: 'elbow-to-wrist' },
});

arm.part('tool-placeholder', toolPlaceholder, {
  connectors: {
    mount: { origin: [0, toolWidth / 2, plateThickness / 2], axis: [0, 1, 0] },
  },
  connect: { connector: 'mount', to: wrist.connector('tip'), name: 'wrist-to-tool' },
});

// --- joints ---------------------------------------------------------------

arm.revolute('base-yaw', base, shoulder, {
  axis: [0, 0, 1],
  origin: [baseX / 2, baseY / 2, plateThickness],
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
