// Manufacturing benchmark case 08 (#1227): an SG90 servo lever on a printed
// mounting plate, the servo adapter case with a purchased part.
//
// Prompt: "Mount an SG90 micro servo through a 4 mm PETG plate, ears resting
// on the plate and screwed down with M2 screws. Fit the single-arm horn and
// screw a 3 mm PETG lever on top of it, with a 3 mm hole at the lever tip
// 50 mm from the shaft axis. The lever must swing 180 degrees without
// touching the servo or the plate. Keep it working when the lever gets
// longer."
//
// Parts and interfaces the benchmark checks:
//   - `servo`: the Juan Fenoy SG90 community STEP (lib.standard.sg90(),
//     CC-BY-SA-4.0), shaft-centred, bottom at z = 0, ear undersides at
//     z = 15.9, gear housing top at z = 26.7, shaft tip at z = 29.9;
//     connector `shaft` on the z axis at the shaft tip;
//   - `plate`: 24 x 46 x 4 mm, z = 11.9..15.9, with a pocket 0.3 mm wider
//     than the 11.8 x 22.5 mm body on every side and two 2.4 mm M2
//     clearance holes on the ear-hole axes (0, -18.95) and (0, 8.25);
//     connector `ear` on the low hole axis at the plate top, matching the
//     servo's `ear` on the ear underside;
//   - `arm`: the SG90 single-arm horn turned over (socket facing the motor)
//     with its socket opening at z = 27.0, 0.3 mm above the gear housing and
//     2.9 mm of shaft in the 3 mm socket, plus a 10 mm wide, 3 mm thick lever
//     on the horn face (z = 32..35) with a 5 mm access hole over the horn
//     screw, two 1.4 mm pilot holes over horn holes 7 and 15, and a 3 mm tip
//     hole at x = LeverReach; connector `hub` on the shaft axis;
//   - mates: `screwed` (fastened servo.ear -> plate.ear, the low ear hole
//     axis on the ear underside) and `swing` (revolute servo.shaft ->
//     arm.hub, 0..180 degrees, carried by the servo).
// The servo and horn are community reference geometry: SG90 supplier
// variant, spline engagement, screws and stall torque are not verified.
const leverReach = param('LeverReach', 50, { unit: 'mm', min: 30, max: 80 });
const earZ = 15.9;
const plateThickness = 4;
const pocketClearance = 0.3;
const socketOpeningZ = 27.0;
const shaftTipZ = 29.9;

const servo = await lib.standard.sg90();
const horn = await lib.standard.sg90HornSingleArm();

// Body 11.8 x 22.5 mm: x -5.9..5.9, y -16.6..5.9 in the servo's frame.
const pocket = box(11.8 + 2 * pocketClearance, 22.5 + 2 * pocketClearance, 20)
  .translate(-5.9 - pocketClearance, -16.6 - pocketClearance, 0);
const m2Clearance = cylinder(20, 1.2);
const plate = box(24, 46, plateThickness).translate(-12, -28, earZ - plateThickness)
  .subtract(pocket)
  .subtract(m2Clearance.translate(0, -18.95, 0))
  .subtract(m2Clearance.translate(0, 8.25, 0));

// Arm frame: origin on the shaft tip, so the horn socket (z 2..5 on the part)
// is turned over and lifted until its opening sits at socketOpeningZ.
const hornLift = socketOpeningZ - shaftTipZ + 5;
const leverZ = hornLift;
const lever = box(leverReach.add(12), 10, 3).translate(-6, -5, leverZ)
  .subtract(cylinder(10, 2.5).translate(0, 0, leverZ - 1))
  .subtract(cylinder(10, 0.7).translate(7, 0, leverZ - 1))
  .subtract(cylinder(10, 0.7).translate(15, 0, leverZ - 1))
  .subtract(cylinder(10, 1.5).translate(leverReach, 0, leverZ - 1));
const arm = horn.rotate([1, 0, 0], 180).translate(0, 0, hornLift).union(lever);

const shaftAxis = (z: number) => ({ type: 'axis' as const, origin: { kind: 'vec3' as const, value: [0, 0, z] as [number, number, number] }, axis: [0, 0, 1] as [number, number, number] });
const mount = assembly('sg90-lever-mount');
const earLow = { type: 'frame' as const, origin: { kind: 'vec3' as const, value: [0, -18.95, earZ] as [number, number, number] } };
mount.part('servo', servo.color('#2459c4')).connector('shaft', shaftAxis(shaftTipZ)).connector('ear', earLow);
mount.part('plate', plate.color('#d9d4c7')).connector('ear', earLow);
mount.part('arm', arm.color('#f2f2f2')).connector('hub', shaftAxis(0));
mount.mate('screwed', 'servo.ear', 'plate.ear', 'fastened');
mount.mate('swing', 'servo.shaft', 'arm.hub', 'revolute', { limitsDeg: [0, 180] });
mount.jointSupport('swing-support', { mate: 'swing', shaft: 'servo', supports: ['servo'], output: 'arm' });
return mount.solvedModel({}, { validate: 'error' });
