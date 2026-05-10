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
//   - Every part participates in the joint graph via `arm.fixed(...)` /
//     `arm.revolute(...)`, so `kernelcad validate` sees the assembly as
//     a connected mechanism — not just a bag of parts at random positions.
//     This is what makes the assembly REAL: it has declared topology, not
//     just spatial coincidence.
//
// The full preassembled `parts/SO100_Assembly.step` is also bundled —
// agents can `lib.fromSTEP('parts/SO100_Assembly.step')` for the full
// 5-DOF follower arm in a single line when they want it.

const servo1 = (await lib.fromSTEP('parts/STS3215.step')).color('servo');
const servo2 = (await lib.fromSTEP('parts/STS3215.step')).color('servo');
const horn   = (await lib.fromSTEP('parts/Passive_Horn.step')).color('gear');
const jaw    = (await lib.fromSTEP('parts/Moving_Jaw.step')).color('frame');

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
  .color('frame');

// STS3215 mounting flange sits 4 mm above the plate (typical M3 washer
// + bolt-head clearance). Z offset = 19.4 (half body) + 4 (clearance).
const SERVO1_Z = 19.4 + 4;
const servo1Placed = servo1.translate(0, 0, SERVO1_Z);
const hornPlaced = horn.translate(0, 0, SERVO1_Z + 19.4 + 1);

// Bracket on top of horn links to servo 2. Rounded-corner aluminium plate
// matching the base's visual language; sits just above the horn (1.5 mm
// air gap clears the BREP interference check).
const bracket = extrudeRoundedRect(50, 60, 8, 4)
  .fillet(0.8)
  .translate(0, 0, SERVO1_Z + 19.4 + 3.1 + 3.5 - 2)
  .color('plate');

// Servo 2: gripper-actuator, mounted on the bracket. Rotated 90° so its
// output shaft faces +X (toward the jaw). Y-offset so the body clears
// the jaw on swing.
const servoZ2 = SERVO1_Z + 19.4 + 3.1 + 5.5 + 12.4 + 1;
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
arm.fixed('base-shoulder-bolts',   basePart,    shoulderSrv);
arm.fixed('shoulder-horn-coupling', shoulderSrv, hornPart);
arm.fixed('horn-bracket-bolts',    hornPart,    bracketPart);
arm.fixed('bracket-gripper-bolts', bracketPart, gripperSrv);
arm.fixed('gripper-jaw-coupling',  gripperSrv,  jawPart);

return arm.solvedModel({});
