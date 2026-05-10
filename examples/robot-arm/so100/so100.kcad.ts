// LeRobot SO-ARM-100 reference hero.
//
// Composes a 2-DOF gripper subassembly from real vendor STEP files and
// locally-authored mounting brackets — a compact, recognizable slice of
// the SO-100 design that demonstrates the v0.5 authoring rule:
//
//   - Vendor catalog components (Feetech STS3215 servos, SO-100 jaw and
//     output horn) imported via `lib.fromSTEP(path)`. Geometric fidelity
//     matches the real part. No re-modelling.
//
//   - Scene-specific custom geometry (the base plate and the two-servo
//     connecting bracket) authored with `box(...)` + `.holes(...)`. These
//     are the printed parts an SO-100 builder fabricates themselves.
//
// The full preassembled `parts/SO100_Assembly.step` is also bundled —
// agents can `lib.fromSTEP('parts/SO100_Assembly.step')` for the full
// 5-DOF follower arm in a single line when they want it.

const servo1 = (await lib.fromSTEP('parts/STS3215.step')).color('servo');
const servo2 = (await lib.fromSTEP('parts/STS3215.step')).color('servo');
const horn   = (await lib.fromSTEP('parts/Passive_Horn.step')).color('gear');
const jaw    = (await lib.fromSTEP('parts/Moving_Jaw.step')).color('frame');

// STS3215 local bbox: 45×25×40 mm, with the body roughly centered on its
// local origin. We orient and place each servo in the assembly frame.

const basePlate = box(120, 100, 6, true).translate(0, 0, -3).color('plate');

// Servo 1: shoulder-pan, sitting upright on the base plate. STS3215's
// short axis (z) points up; we sit its bottom face (z = -19.4 local) at
// the desk surface (z = 0).
const servo1Placed = servo1.translate(0, 0, 19.4);

// Output horn rides on top of servo 1's shaft.
const hornPlaced = horn.translate(0, 0, 19.4 + 19.4 + 1);

// Bracket on top of horn links to servo 2. 4 mm aluminium plate sitting
// just above the horn so it doesn't clip — 1.5 mm air gap to the horn.
const bracket = box(50, 60, 4, true)
  .translate(0, 0, 19.4 + 19.4 + 3.1 + 3.5)
  .color('plate');

// Servo 2: gripper-actuator, mounted on the bracket. Rotated 90° so its
// output shaft faces +X (toward the jaw). Y-offset so the body clears
// the jaw on swing.
const servoZ2 = 19.4 + 19.4 + 3.1 + 5.5 + 12.4 + 1;
const servo2Placed = servo2
  .rotate([1, 0, 0], 90)
  .translate(0, -10, servoZ2);

// Jaw mounted on servo 2's output, in front of the servo so the gripper
// reads as "open" in the hero pose. The X-offset (+50) pushes the jaw
// clear of the servo body — SO-100's full assembly uses a coupling here.
const jawPlaced = jaw
  .rotate([1, 0, 0], -90)
  .rotate([0, 0, 1], 20)
  .translate(50, -10, servoZ2);

const arm = assembly('so100-gripper');
arm.part('base-plate', basePlate);
arm.part('shoulder-servo', servo1Placed);
arm.part('output-horn', hornPlaced);
arm.part('link-bracket', bracket);
arm.part('gripper-servo', servo2Placed);
arm.part('gripper-jaw', jawPlaced);

return arm.solvedModel({});
