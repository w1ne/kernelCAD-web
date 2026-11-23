// Geared two-finger gripper.
//
// Two equal spur gears mesh between the fingers, so the fingers always turn
// by equal and opposite angles. `arm.coupleMates('right', { source: 'left',
// ratio: -1 })` states that: the driven mate's value is
// source * ratio + offset. solvedModel, the mechanism sweep, verify, pose
// animation and the URDF (mimic) / MJCF exports all honour it, so only the
// source mate is posed or swept.
//
// Without the coupling the sweep would turn one gear while the other stands
// still, and the teeth would clash at a pose the gear train can never reach.
// Do not hide that with solvedModel({ ignore }); declare the coupling.

const module = 1.5;
const teeth = 12;
const pitchR = (module * teeth) / 2; // 9 mm, centre distance 2 * pitchR
const face = 4;
const palmT = 4;
const pinR = 2;
const boreR = 2.2;
const fingerLen = 34;

const gripper = assembly('geared two-finger gripper');

const palm = gripper.part(
  'palm',
  union(
    box(56, 30, palmT, true).fillet(1).translate(0, 4, palmT / 2),
    cylinder(face + 1, pinR).translate(-pitchR, 0, palmT),
    cylinder(face + 1, pinR).translate(pitchR, 0, palmT),
  ),
  { material: 'pla' },
);
palm
  .connector('left-pivot', { type: 'axis', origin: { kind: 'vec3', value: [-pitchR, 0, palmT] }, axis: [0, 0, 1] })
  .connector('right-pivot', { type: 'axis', origin: { kind: 'vec3', value: [pitchR, 0, palmT] }, axis: [0, 0, 1] });

// Each finger is a gear with a jaw arm, built around its own pivot at the
// origin. The right gear turns half a tooth so a tooth space faces the left
// gear's tooth on the line of centres.
const finger = (side: 1 | -1) => {
  const gear = spurGear({ module, teeth, faceWidth: face, bore: 2 * boreR, backlash: 0.15 })
    .rotateZ(side > 0 ? 180 / teeth : 0);
  const arm = box(5, fingerLen, face, true).fillet(1, { parallel: 'Z' }).translate(side * 4, pitchR + fingerLen / 2, face / 2);
  const pad = box(3, 10, face, true).translate(side * 4 - side * 3.5, pitchR + fingerLen - 5, face / 2);
  return union(gear, arm, pad);
};

for (const [name, side] of [['left', -1], ['right', 1]] as const) {
  const part = gripper.part(`${name}-finger`, finger(side), { material: 'pla' });
  part.connector('pivot', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
  gripper.mate(name, `palm.${name}-pivot`, `${name}-finger.pivot`, 'revolute', { limitsDeg: name === 'left' ? [-8, 20] : [-20, 8] });
}

// The gear pair: right = -1 * left. Pose and sweep only 'left'.
gripper.coupleMates('right', { source: 'left', ratio: -1 });
gripper.transmission('finger-gears', {
  kind: 'gear-pair',
  sourceMate: 'left',
  drivenMates: ['right'],
  input: 'left-finger',
  output: 'right-finger',
  path: ['left-finger', 'right-finger'],
  ratio: -1,
});

return gripper.solvedModel({ left: 10 });
