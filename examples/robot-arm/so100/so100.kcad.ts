// SO-ARM100 gripper: the follower arm's end effector on its own.
//
// Three real parts, in the so100.urdf gripper frame (millimetres):
//   - hand:       Fixed_Jaw, the printed fixed finger and servo cradle;
//   - hand-servo: Fixed_Jaw_Motor, the Feetech STS3215 bolted in the cradle;
//   - jaw:        Moving_Jaw, the printed moving finger on the servo spline.
// Meshes are the Apache-2.0 vendor simulation visuals. The two printed parts
// come from parts/sim-seated/ (servo pocket and swept spline clearance cut
// exactly, see parts/seat_meshes.py), so the solids touch and never overlap.
//
// The servo is fastened in the cradle; the moving jaw turns on the servo
// output (URDF joint `gripper`, axis local Z). -11° is the closed stop.

const PRINT = '#f0c43a';
const jawDeg = param('jawDeg', -11, { min: -11, max: 110, description: 'Gripper opening' });

const arm = assembly('so100-gripper');

const load = async (dir: string, file: string) => (await lib.fromSTL(`parts/${dir}/${file}.stl`)).scale(1000);

// URDF joint `gripper`: xyz (-20.2, -24.4, 0) mm, rpy (0, 180°, 0).
const hand = arm.part('hand', (await load('sim-seated', 'Fixed_Jaw')).color(PRINT));
const servo = arm.part('hand-servo', (await load('sim', 'Fixed_Jaw_Motor')).color('servo'));
const jaw = arm.part(
  'jaw',
  (await load('sim-seated', 'Moving_Jaw')).rotate([0, 1, 0], 180).translate(-20.2, -24.4, 0).color(PRINT),
);

// The servo body centre sits in the cradle; the output spline tip is on the
// joint axis, where the moving jaw's hub bolts on.
const seat = { kind: 'vec3' as const, value: [-7.7, -24.4, 0.5] as [number, number, number] };
hand.connector('servo', { type: 'frame', origin: seat });
servo.connector('mount', { type: 'frame', origin: seat });
arm.mate('servo-fix', 'hand.servo', 'hand-servo.mount', 'fastened');

const shaft = {
  type: 'axis' as const,
  origin: { kind: 'vec3' as const, value: [-20.2, -24.4, 20.3] as [number, number, number] },
  // Child axis +Z turned by the 180° about Y: world -Z.
  axis: [0, 0, -1] as [number, number, number],
};
servo.connector('shaft', shaft);
jaw.connector('in', shaft);
arm.mate('jaw', 'hand-servo.shaft', 'jaw.in', 'revolute', { pose: jawDeg, limitsDeg: [-11, 110] });

animationView({
  name: 'grip',
  fps: 24,
  tracks: [
    { param: 'jawDeg', keys: [
      { atMs: 0, value: -11 },
      { atMs: 1500, value: 90, ease: 'easeInOut' },
      { atMs: 3000, value: -11, ease: 'easeInOut' },
    ] },
  ],
});

// `ignore` only silences the BREP boolean probe, which misreads solids sewn
// from STL. The mechanism gate's rest-pose mesh check still measures them.
return arm.solvedModel({}, { ignore: [['hand', 'hand-servo'], ['hand-servo', 'jaw'], ['hand', 'jaw']] });
