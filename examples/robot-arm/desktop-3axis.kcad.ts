// Desktop 3-axis robot arm — worked example (body-tree forward kinematics).
//
// Composes a posed multi-link arm out of generic kernelCAD primitives. Each
// link plate is constructed with its real-world orientation BAKED into the
// part's local frame: the shoulder column is vertical (long axis +Z), the
// elbow + wrist forearms extend forward (+X). At kinematic-zero the arm
// already reads as a bent silhouette before any joint pose is applied.
//
// arm.solvedModel({ baseYaw, shoulderPitch, elbowPitch }) drives the hero
// pose. Joint origins are numeric Vec3 in the PARENT'S LOCAL FRAME (body-
// tree FK convention from URDF / MuJoCo / Drake). The kernel does NOT
// ship a robot-arm template; this example exists to show an agent how to
// build one (or any analogous articulated mechanism) from the lean
// generic toolset.

// ---- pose params ---------------------------------------------------------
// Hero pose: confident articulated silhouette readable from every camera angle.
const baseYawDeg       = 20;
const shoulderPitchDeg = 35;
const elbowPitchDeg    = -55;

// ---- geometry params -----------------------------------------------------
const baseX = param('baseX', 90);
const baseY = param('baseY', 70);
const baseT = param('baseT', 8);

const linkWidth     = param('linkWidth', 16);
const linkThickness = param('linkThickness', 5);

const shoulderHeight = param('shoulderHeight', 90);
const elbowLength    = param('elbowLength', 110);
const wristLength    = param('wristLength', 75);

const toolLength = param('toolLength', 30);
const toolWidth  = param('toolWidth', 14);

const screwSpacingX = param('screwSpacingX', 30);
const screwSpacingY = param('screwSpacingY', 26);
const screwDiameter = param('screwDiameter', 3);
const pivotDiameter = param('pivotDiameter', 5);

// Derived dims stay symbolic via ParamRef arithmetic for the geometry-side
// dimensions. Joint origins below use plain numeric Vec3 (v1 spec).
const halfScrewX = screwSpacingX.divide(2);
const halfScrewY = screwSpacingY.divide(2);
const halfLinkW  = linkWidth.divide(2);

// ---- parts ---------------------------------------------------------------

// Base plate: corner-anchored at origin (extends +X +Y +Z).
// Local origin at (0, 0, 0); top face at z = baseT.
// Center-of-top is (baseX/2, baseY/2, baseT) — that's where the shoulder
// column attaches via the base-yaw joint.
const basePlate = box(baseX, baseY, baseT)
  .holes('top', {
    positions: [
      { u: halfScrewX.negate(), v: halfScrewY.negate() },
      { u: halfScrewX,          v: halfScrewY.negate() },
      { u: halfScrewX.negate(), v: halfScrewY          },
      { u: halfScrewX,          v: halfScrewY          },
    ],
    diameter: screwDiameter,
    depth: 'through',
    name: 'mountScrews',
  })
  .hole('top', {
    u: 0,
    v: 0,
    diameter: pivotDiameter,
    depth: 'through',
    name: 'basePivot',
  });

// Shoulder column: vertical (long axis +Z).
// box() is corner-anchored, so we shift so the bottom-center sits at the
// part's local origin. That way attaching at the base-yaw joint origin
// puts the column upright at the base's center.
//   x in [-linkWidth/2, +linkWidth/2]
//   y in [-linkThickness/2, +linkThickness/2]
//   z in [0, shoulderHeight]
const shoulderColumn = box(linkWidth, linkThickness, shoulderHeight)
  .translate(linkWidth.divide(2).negate(), linkThickness.divide(2).negate(), 0);

// Elbow forearm: horizontal forward (long axis +X).
// Local origin at the proximal (-X) end and centered on Y/Z so attaching
// it at the top of the shoulder lines the forearm up forward.
//   x in [0, elbowLength]
//   y in [-linkWidth/2, +linkWidth/2]
//   z in [-linkThickness/2, +linkThickness/2]
const elbowArm = box(elbowLength, linkWidth, linkThickness)
  .translate(0, linkWidth.divide(2).negate(), linkThickness.divide(2).negate())
  .holes('top', {
    positions: [
      { u: halfLinkW,                       v: 0 },
      { u: elbowLength.subtract(halfLinkW), v: 0 },
    ],
    diameter: pivotDiameter,
    depth: 'through',
    name: 'elbowPivots',
  });

// Wrist forearm: horizontal forward, slightly slimmer than the elbow.
const wristArm = box(wristLength, linkWidth.multiply(0.85), linkThickness)
  .translate(0, linkWidth.multiply(0.85).divide(2).negate(), linkThickness.divide(2).negate())
  .holes('top', {
    positions: [
      { u: halfLinkW,                       v: 0 },
      { u: wristLength.subtract(halfLinkW), v: 0 },
    ],
    diameter: pivotDiameter,
    depth: 'through',
    name: 'wristPivots',
  });

// Tool placeholder: small flat tab + finger cylinder, with the proximal
// end at the part's local origin so it bolts onto the wrist tip.
const toolTab = box(toolLength, toolWidth, linkThickness)
  .translate(0, toolWidth.divide(2).negate(), linkThickness.divide(2).negate());
const toolFinger = cylinder(linkThickness.multiply(2), pivotDiameter.divide(2).add(1))
  .translate(toolLength, 0, 0);
const toolPlaceholder = union(toolTab, toolFinger);

// ---- assembly ------------------------------------------------------------

const arm = assembly('desktop 3-axis robot arm');

const base     = arm.part('base',     basePlate);
const shoulder = arm.part('shoulder', shoulderColumn);
const elbow    = arm.part('elbow',    elbowArm);
const wrist    = arm.part('wrist',    wristArm);
const tool     = arm.part('tool',     toolPlaceholder);

// ---- joints --------------------------------------------------------------
//
// Joint origins live in the PARENT'S LOCAL FRAME (URDF / MuJoCo / Drake
// body-tree FK convention). v1 of the joint API takes plain numeric Vec3
// for `origin` — pose reactivity for joint frames is deferred to a future
// slice, so we hardcode literal numerics matching the param defaults
// above. If `baseX` is later edited via setParamValue, the basePlate
// geometry rescales but the base-yaw joint origin stays put. Known v1
// limitation; tracked separately.

// base-yaw: rotates the shoulder column around +Z, anchored at the
// center of the base plate's top face.
arm.revolute('base-yaw', base, shoulder, {
  axis: [0, 0, 1],
  origin: [90 / 2, 70 / 2, 8], // [baseX/2, baseY/2, baseT] in base local frame
  limitsDeg: [-120, 120],
});

// shoulder-pitch: rotates the elbow forearm around +Y at the top of
// the shoulder column.
arm.revolute('shoulder-pitch', shoulder, elbow, {
  axis: [0, 1, 0],
  origin: [0, 0, 90], // [0, 0, shoulderHeight] in shoulder local frame
  limitsDeg: [-45, 135],
});

// elbow-pitch: rotates the wrist forearm around +Y at the elbow's tip.
arm.revolute('elbow-pitch', elbow, wrist, {
  axis: [0, 1, 0],
  origin: [110, 0, 0], // [elbowLength, 0, 0] in elbow local frame
  limitsDeg: [-120, 120],
});

// wrist-tool: rigid attach. Anchors the tool placeholder at the wrist's tip.
arm.fixed('wrist-tool', wrist, tool, {
  origin: [75, 0, 0], // [wristLength, 0, 0] in wrist local frame
});

// ---- hero pose -----------------------------------------------------------
// solvedModel() runs body-tree FK and returns the unioned posed Shape via
// SolvedKinematics.toShape(). At pose (baseYaw=20°, shoulderPitch=35°,
// elbowPitch=-55°) the arm reads as a confident articulated silhouette
// from every camera angle. Fixed joints have no DOF and accept no pose.

return arm.solvedModel({
  'base-yaw':       baseYawDeg,
  'shoulder-pitch': shoulderPitchDeg,
  'elbow-pitch':    elbowPitchDeg,
});
