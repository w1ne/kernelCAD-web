// Desktop 3-axis robot arm — worked example.
//
// Composes a recognizable robot arm out of generic kernelCAD primitives. The
// kernel does NOT ship a robot-arm template; this example exists to show an
// agent how to build one from the lean generic toolset.
//
// Each link plate is constructed with its real-world orientation BAKED into
// the part — the shoulder is vertical (long axis +Z), the elbow extends
// forward (+X), the wrist extends forward (+X) at the end of the elbow, the
// tool placeholder hangs forward at the wrist tip. This lets the kinematic-
// zero pose render as a recognizable arm silhouette without a joint-pose API.
//
// Every dimension is a param() call. Connector frames, derived dimensions,
// and joint origins all participate in ParamRef arithmetic, so a single
// setParamValue('shoulderHeight', 80) re-lowers the entire assembly: the
// shoulder grows taller, the elbow + wrist + tool ride up with it via the
// reactive worldOrigin chain. Worked example for the parametric assembly
// closure that landed in v0.4.1 (PR #122).

const baseX = param('baseX', 70);
const baseY = param('baseY', 46);
const plateThickness = param('plateThickness', 4);
const linkThickness = param('linkThickness', 5);
const linkWidth = param('linkWidth', 16);
const pivotDiameter = param('pivotDiameter', 5);

// Vertical shoulder column.
const shoulderHeight = param('shoulderHeight', 60);
// Forward-reaching upper arm.
const elbowLength = param('elbowLength', 70);
// Forward-reaching forearm.
const wristLength = param('wristLength', 50);
// End-effector size.
const toolLength = param('toolLength', 22);
const toolDiameter = param('toolDiameter', 10);

const screwSpacingX = param('screwSpacingX', 24);
const screwSpacingY = param('screwSpacingY', 12);
const screwDiameter = param('screwDiameter', 3);

const screwHalfX = screwSpacingX.divide(2);
const screwHalfY = screwSpacingY.divide(2);
const halfBaseX = baseX.divide(2);
const halfBaseY = baseY.divide(2);
const halfLinkW = linkWidth.divide(2);
const halfLinkT = linkThickness.divide(2);

// --- parts ----------------------------------------------------------------

// Base plate: horizontal, lies on the table. Pivot at top center.
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

// Shoulder column: tall, vertical. Long axis = Z.
// box(width, thickness, height). Root at the bottom-center, tip at top.
const shoulderColumn = box(linkWidth, linkThickness, shoulderHeight);

// Elbow upper arm: horizontal, extends forward (+X). Long axis = X.
// box(length, width, thickness). Root at one end, tip at the other.
const elbowArm = box(elbowLength, linkWidth, linkThickness)
  .hole('top', {
    u: elbowLength.divide(-2).add(halfLinkW),
    v: 0,
    diameter: pivotDiameter,
    depth: 'through',
    name: 'elbowPivotRoot',
  })
  .hole('top', {
    u: elbowLength.divide(2).subtract(halfLinkW),
    v: 0,
    diameter: pivotDiameter,
    depth: 'through',
    name: 'elbowPivotTip',
  });

// Wrist forearm: horizontal forward, slimmer than the elbow.
const wristWidth = linkWidth.multiply(0.85);
const halfWristW = wristWidth.divide(2);
const wristArm = box(wristLength, wristWidth, linkThickness)
  .hole('top', {
    u: wristLength.divide(-2).add(halfWristW),
    v: 0,
    diameter: pivotDiameter,
    depth: 'through',
    name: 'wristPivotRoot',
  })
  .hole('top', {
    u: wristLength.divide(2).subtract(halfWristW),
    v: 0,
    diameter: pivotDiameter,
    depth: 'through',
    name: 'wristPivotTip',
  });

// Tool placeholder: a flat tab + a small finger cylinder at the end.
const toolWidth = linkWidth.multiply(0.7);
const toolPlaceholder = union(
  box(toolLength, toolWidth, linkThickness),
  cylinder(linkThickness, toolDiameter.divide(2)).translate(toolLength.divide(2), 0, 0),
);

// --- assembly -------------------------------------------------------------

const arm = assembly('desktop 3-axis robot arm');

const base = arm.part('base-plate', basePlate, {
  at: [0, 0, 0],
  connectors: {
    pivot: { origin: [halfBaseX, halfBaseY, plateThickness], axis: [0, 0, 1] },
  },
});

// Shoulder column stands vertically on the base. Its local root connector
// is at the bottom-center; tip is at the top-center.
const shoulder = arm.part('shoulder-column', shoulderColumn, {
  connectors: {
    root: { origin: [0, 0, shoulderHeight.divide(-2).add(halfLinkT)], axis: [0, 0, 1] },
    tip:  { origin: [0, 0, shoulderHeight.divide(2).subtract(halfLinkT)], axis: [0, 1, 0] },
  },
  connect: { connector: 'root', to: base.connector('pivot'), name: 'base-to-shoulder' },
});

// Elbow extends forward (+X) from the top of the shoulder. Its local root is
// at one end, tip at the other.
const elbow = arm.part('elbow-arm', elbowArm, {
  connectors: {
    root: { origin: [elbowLength.divide(-2).add(halfLinkW), 0, halfLinkT], axis: [0, 1, 0] },
    tip:  { origin: [elbowLength.divide(2).subtract(halfLinkW),  0, halfLinkT], axis: [0, 1, 0] },
  },
  connect: { connector: 'root', to: shoulder.connector('tip'), name: 'shoulder-to-elbow' },
});

// Wrist extends forward from the tip of the elbow.
const wrist = arm.part('wrist-arm', wristArm, {
  connectors: {
    root: { origin: [wristLength.divide(-2).add(halfWristW), 0, halfLinkT], axis: [0, 1, 0] },
    tip:  { origin: [wristLength.divide(2).subtract(halfWristW), 0, halfLinkT], axis: [0, 1, 0] },
  },
  connect: { connector: 'root', to: elbow.connector('tip'), name: 'elbow-to-wrist' },
});

// Tool placeholder hangs at the wrist tip, extending forward.
arm.part('tool-placeholder', toolPlaceholder, {
  connectors: {
    mount: { origin: [toolLength.divide(-2), 0, halfLinkT], axis: [0, 1, 0] },
  },
  connect: { connector: 'mount', to: wrist.connector('tip'), name: 'wrist-to-tool' },
});

// --- joints ---------------------------------------------------------------
//
// Joints define DOF (which axis each link CAN rotate about, with limits).
// At kinematic-zero pose the assembly renders straight-through; a future
// joint-pose API will let `setParamValue('shoulderPitch', 30)` bend it.
//
// Joint origins are read from the parent's worldOrigin (symbolic Vec3Param),
// so a setParamValue on any base dimension reactively re-positions the joint.

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
