// LeRobot SO-ARM-100 reference hero.
//
// Composes a 2-DOF gripper subassembly from real vendor STEP files and
// locally-authored mounting brackets. Demonstrates the v0.5 authoring
// rule + the new MVP assembly validator:
//
//   - Vendor catalog components (Feetech STS3215 servos, SO-100 jaw and
//     output horn) imported via `lib.fromSTEP(path)`. Geometric fidelity
//     matches the real part. No re-modelling.
//
//   - Scene-specific custom geometry (the base plate and the two-servo
//     connecting bracket) authored with `box(...)`. These are the printed
//     parts an SO-100 builder fabricates themselves.
//
//   - Every part participates in the mate graph via `arm.mate(..., 'fastened')`,
//     so `kernelcad validate` sees the assembly as
//     a connected mechanism — not just a bag of parts at random positions.
//     This is what makes the assembly REAL: it has declared topology, not
//     just spatial coincidence.
//
// The full preassembled `parts/SO100_Assembly.step` is also bundled —
// agents can `lib.fromSTEP('parts/SO100_Assembly.step')` for the full
// 5-DOF follower arm in a single line when they want it.

// Finishes read as the real build: black ABS servo housings, a machined
// aluminium output horn, and the jaw and bracket in white printed PLA.
const PRINTED = '#ddd7cb';
const servo1 = (await lib.fromSTEP('parts/STS3215.step')).finish('abs', { color: '#222529' });
const servo2 = (await lib.fromSTEP('parts/STS3215.step')).finish('abs', { color: '#222529' });
const horn   = (await lib.fromSTEP('parts/Passive_Horn.step')).finish('aluminium');
const jaw    = (await lib.fromSTEP('parts/Moving_Jaw.step')).finish('pla', { color: PRINTED });

// STS3215 local bbox: 45×25×40 mm, body roughly centered on its origin.
// Z constants below are stacked offsets up the assembly axis.

// Engineered base: rounded-rect plate with 4 corner feet, fillets, and a
// machined-aluminium look. Demonstrates that custom plates can be visually
// substantial even when authored purely from primitives.
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
  .finish('anodized', { color: '#2c313a' });

// STS3215 mounting flange sits 4 mm above the plate (typical M3 washer
// + bolt-head clearance). Z offset = 19.4 (half body) + 4 (clearance).
const SERVO1_Z = 19.4 + 4;
// Measured STEP extents (mm). The servo output face is local +Z at 20.2
// (body ±22.7 in X). The horn disc starts at local Z = 0 and is 3.1 thick.
// The jaw's M3 bolt circle is centered at local (0, 0, -24); the finger
// runs along local -Y. A rotate about X points the shaft at -Y, which left
// the jaw beside the body.
const SERVO_SHAFT_Z = 20.2;
const SERVO_HALF_X = 22.7;
const HORN_THICK = 3.1;
const BRACKET_THICK = 4;
const JAW_MOUNT_Z = -24;
const servo1Placed = servo1.translate(0, 0, SERVO1_Z);
const hornPlaced = horn.translate(0, 0, SERVO1_Z + SERVO_SHAFT_Z);

const bracket = extrudeRoundedRect(50, 60, 8, 4)
  .fillet(0.8)
  .translate(0, 0, SERVO1_Z + SERVO_SHAFT_Z + HORN_THICK)
  .finish('pla', { color: PRINTED });

// Shaft (local +Z) points +X. The body stands on the bracket.
const servoZ2 = SERVO1_Z + SERVO_SHAFT_Z + HORN_THICK + BRACKET_THICK + SERVO_HALF_X;
const servo2Placed = servo2
  .rotate([0, 1, 0], 90)
  .translate(0, 0, servoZ2);

// Bore along the shaft, finger up, mount face on the output face.
const jawPlaced = jaw
  .rotate([0, 1, 0], 90)
  .rotate([1, 0, 0], -90)
  .translate(SERVO_SHAFT_Z - JAW_MOUNT_Z, 0, servoZ2);

const arm = assembly('so100-gripper');
const basePart    = arm.part('base-plate',     basePlate);
const shoulderSrv = arm.part('shoulder-servo', servo1Placed);
const hornPart    = arm.part('output-horn',    hornPlaced);
const bracketPart = arm.part('link-bracket',   bracket);
const gripperSrv  = arm.part('gripper-servo',  servo2Placed);
const jawPart     = arm.part('gripper-jaw',    jawPlaced);

// Declared topology: shoulder-servo bolts to base-plate, horn fastens to
// the shoulder-servo's shaft (fixed, posed at zero rotation for the hero),
// bracket fastens to the horn, gripper-servo bolts to the bracket, jaw
// fastens to the gripper-servo's output (fixed at the hero pose). Switch
// to `revolute` when the demo needs articulation.
// G0 (2026-05-31): legacy `arm.fixed(...)` was removed. Declare each
// fastener as a `arm.mate(..., 'fastened')` between named frame connectors
// on the two coupled parts. Each part gets a single frame connector at its
// local origin (parts are already placed via `at:` so the world frame is
// what we want for the fastened-mate alignment).
basePart.connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
shoulderSrv.connector('mount-from-base', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
shoulderSrv.connector('mount-to-horn', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
hornPart.connector('mount-from-shoulder', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
hornPart.connector('mount-to-bracket', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
bracketPart.connector('mount-from-horn', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
bracketPart.connector('mount-to-gripper', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
gripperSrv.connector('mount-from-bracket', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
gripperSrv.connector('mount-to-jaw', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
jawPart.connector('mount-from-gripper', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });

arm.mate('base-shoulder-bolts', 'base-plate.mount', 'shoulder-servo.mount-from-base', 'fastened');
arm.mate('shoulder-horn-coupling', 'shoulder-servo.mount-to-horn', 'output-horn.mount-from-shoulder', 'fastened');
arm.mate('horn-bracket-bolts', 'output-horn.mount-to-bracket', 'link-bracket.mount-from-horn', 'fastened');
arm.mate('bracket-gripper-bolts', 'link-bracket.mount-to-gripper', 'gripper-servo.mount-from-bracket', 'fastened');
arm.mate('gripper-jaw-coupling', 'gripper-servo.mount-to-jaw', 'gripper-jaw.mount-from-gripper', 'fastened');

return arm.solvedModel({});
