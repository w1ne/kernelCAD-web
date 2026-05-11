// LeRobot SO-ARM-100 reference hero — v0.6 mate-graph rewrite.
//
// Same geometry as `so100.kcad.ts`, but the topology is declared via the
// v0.6 mate vocabulary (`partRef.connector(...)` + `arm.mate(...)`)
// instead of the v0.5 kinematic joint helpers (`arm.fixed/.revolute`).
// The validator now returns `solved` rather than just `warning`, because
// every part is tied into the mate graph and the solver's tree-FK walk
// reaches every node.
//
// Geometric placement still comes from the per-part Shape transforms
// (the same `.translate(...)` / `.rotate(...)` chains the v0.5 hero uses).
// Mates declare DOF + topology; FK over mates lands in T9's pose-driven
// path. For the static hero, the visual layout is whatever the source
// shapes carry — identical to what `so100.kcad.ts` renders.
//
// Mate-graph: open chain rooted at the base plate.
//   base-plate  --fastened--  shoulder-servo
//   shoulder-servo --revolute--  output-horn          (joint 1)
//   output-horn  --fastened--  link-bracket
//   link-bracket --fastened--  gripper-servo
//   gripper-servo --revolute-- gripper-jaw            (joint 2)
//
// 2 revolute mates surface 2 DOF (shoulder + gripper); the rest are
// fastened. Tree topology — no closed loops — so the solver's spanning-
// tree walk classifies the assembly as `solved` in one pass.

const servo1 = (await lib.fromSTEP('parts/STS3215.step')).color('servo');
const servo2 = (await lib.fromSTEP('parts/STS3215.step')).color('servo');
const horn   = (await lib.fromSTEP('parts/Passive_Horn.step')).color('gear');
const jaw    = (await lib.fromSTEP('parts/Moving_Jaw.step')).color('frame');

// Engineered base plate (matches the v0.5 hero's authored geometry).
const PLATE_W = 140, PLATE_D = 110, PLATE_H = 8;
const FOOT_R = 6, FOOT_H = 4;
const FOOT_OFFSET_X = PLATE_W / 2 - 12;
const FOOT_OFFSET_Y = PLATE_D / 2 - 12;
const basePlateRaw = extrudeRoundedRect(PLATE_W, PLATE_D, 12, PLATE_H);
const foot = (sx: number, sy: number): Shape =>
  cylinder(FOOT_H, FOOT_R).translate(sx * FOOT_OFFSET_X, sy * FOOT_OFFSET_Y, -FOOT_H);
const basePlate = basePlateRaw
  .fillet(1.5)
  .union(foot(-1, -1), foot(1, -1), foot(-1, 1), foot(1, 1))
  .translate(0, 0, -PLATE_H / 2)
  .color('frame');

// Shoulder servo (STS3215). Body half-height = 19.4mm, +4mm bolt-head
// clearance places its centerline at SERVO1_Z above the plate.
const SERVO1_Z = 19.4 + 4;
const servo1Placed = servo1.translate(0, 0, SERVO1_Z);

// Output horn sits on top of the shoulder servo's output shaft.
const HORN_Z = SERVO1_Z + 19.4 + 1;
const hornPlaced = horn.translate(0, 0, HORN_Z);

// Link bracket. Rounded-corner aluminium plate, sits just above the horn.
const BRACKET_Z = SERVO1_Z + 19.4 + 3.1 + 3.5 - 2;
const bracket = extrudeRoundedRect(50, 60, 8, 4)
  .fillet(0.8)
  .translate(0, 0, BRACKET_Z)
  .color('plate');

// Gripper servo: rotated 90° about +X so its output shaft faces +X,
// pushed -Y to clear the jaw on swing.
const SERVO2_Z = SERVO1_Z + 19.4 + 3.1 + 5.5 + 12.4 + 1;
const servo2Placed = servo2
  .rotate([1, 0, 0], 90)
  .translate(0, -10, SERVO2_Z);

// Jaw mounted on gripper servo's output, rotated for a partially-open
// hero pose.
const jawPlaced = jaw
  .rotate([1, 0, 0], -90)
  .rotate([0, 0, 1], 20)
  .translate(50, -10, SERVO2_Z);

const arm = assembly('so100-mates');

// Each part carries connectors for the mates it participates in. Connector
// origins are in each part's LOCAL frame (i.e. before the shape's
// .translate/.rotate were applied). For the static hero the numeric
// origin values don't drive visual placement (the lowerer reads the
// per-part shape transform); the solver uses them for loop-closure
// residuals, and SO-100 has no loops, so the tree-FK walk classifies the
// assembly as `solved` regardless of the exact numbers below. Even so we
// pick mechanically meaningful origins so the hero doubles as a worked
// example of how to mount-by-feature.

arm
  .part('base-plate', basePlate)
  // Top surface of the plate, where the shoulder servo bolts on. Plate is
  // translated to -PLATE_H/2 so the top face is at z = +PLATE_H/2 in
  // local-frame terms.
  .connector('shoulder-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, 0, PLATE_H / 2] },
    normal: [0, 0, 1],
  });

arm
  .part('shoulder-servo', servo1Placed)
  // Bottom mounting flange — bolts to the base plate.
  .connector('base-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, 0, -19.4] },
    normal: [0, 0, 1],
  })
  // Output shaft axis — joint 1 (shoulder rotation about Z).
  .connector('output-shaft', {
    type: 'axis',
    origin: { kind: 'vec3', value: [0, 0, 19.4] },
    axis: [0, 0, 1],
  });

arm
  .part('output-horn', hornPlaced)
  // Horn hub — mates with the shoulder servo's output shaft.
  .connector('shaft-hub', {
    type: 'axis',
    origin: { kind: 'vec3', value: [0, 0, 0] },
    axis: [0, 0, 1],
  })
  // Top of the horn — bracket bolts here.
  .connector('bracket-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, 0, 3.1] },
    normal: [0, 0, 1],
  });

arm
  .part('link-bracket', bracket)
  // Bottom face of bracket — bolts onto the horn.
  .connector('horn-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, 0, -2] },
    normal: [0, 0, 1],
  })
  // Top face of bracket — gripper servo bolts here.
  .connector('servo-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, 0, 2] },
    normal: [0, 0, 1],
  });

arm
  .part('gripper-servo', servo2Placed)
  // Bottom mounting flange — bolts to the bracket. The shape is rotated
  // 90° about +X (servo body lies on its side); the flange that mates with
  // the bracket is now at local y = +19.4 after the rotate, but we declare
  // the connector in the pre-rotate local frame.
  .connector('base-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, 0, -19.4] },
    normal: [0, 0, 1],
  })
  // Output shaft — joint 2 (gripper rotation).
  .connector('output-shaft', {
    type: 'axis',
    origin: { kind: 'vec3', value: [0, 0, 19.4] },
    axis: [0, 0, 1],
  });

arm
  .part('gripper-jaw', jawPlaced)
  // Jaw coupling — mates with the gripper servo's output shaft.
  .connector('shaft-hub', {
    type: 'axis',
    origin: { kind: 'vec3', value: [0, 0, 0] },
    axis: [0, 0, 1],
  });

// Mate graph — same connectivity the v0.5 hero declared via arm.fixed(...).
// The two `revolute` mates expose joint 1 (shoulder) + joint 2 (gripper);
// the rest are fastened couplings. Open tree — no closed loops.
arm.mate('shoulder-bolts',          'shoulder-servo.base-mount',  'base-plate.shoulder-mount',   'fastened');
arm.mate('shoulder-output',         'shoulder-servo.output-shaft','output-horn.shaft-hub',       'revolute');
arm.mate('horn-bracket-bolts',      'output-horn.bracket-mount',  'link-bracket.horn-mount',     'fastened');
arm.mate('bracket-gripper-bolts',   'link-bracket.servo-mount',   'gripper-servo.base-mount',    'fastened');
arm.mate('gripper-output',          'gripper-servo.output-shaft', 'gripper-jaw.shaft-hub',       'revolute');

// `validate: 'warn'` attaches diagnostics to scene.warnings rather than
// throwing under the harness's env-default `error` mode. The hero is
// engineered to surface ZERO warnings: every part is mate-connected, the
// graph is a tree, and the solver returns 'solved' on a tree topology.
return arm.solvedModel({}, { validate: 'warn' });
