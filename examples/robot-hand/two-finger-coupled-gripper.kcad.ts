// Two-finger coupled gripper.
//
// One actuator mate (`grip`) drives two finger curl mates through
// `arm.coupleMates(...)`. The review loop can sample the `grip` limits,
// expand the driven poses, and report aperture between the two fingertip
// connectors.

const baseW = 36;
const baseD = 18;
const baseT = 4;
const fingerLen = 36;
const fingerW = 5;
const fingerT = 5;
const hingeX = 12;
const gripMin = 0;
const gripMax = 40;

const hand = assembly('two-finger coupled gripper');

const base = hand.part(
  'palm',
  box(baseW, baseD, baseT, true)
    .fillet(1)
    .translate(0, 0, baseT / 2)
    .color('plate'),
);
base
  .connector('driver', {
    type: 'axis',
    origin: { kind: 'vec3', value: [0, 0, baseT] },
    axis: [0, 0, 1],
  })
  .connector('left-hinge', {
    type: 'axis',
    origin: { kind: 'vec3', value: [-hingeX, 0, baseT] },
    axis: [0, 0, 1],
  })
  .connector('right-hinge', {
    type: 'axis',
    origin: { kind: 'vec3', value: [hingeX, 0, baseT] },
    axis: [0, 0, 1],
  });

const driver = hand.part(
  'grip-driver',
  cylinder(4, 3, 24).color('gear'),
);
driver.connector('axis', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [0, 0, 1],
});

const left = hand.part(
  'left-finger',
  box(fingerLen, fingerW, fingerT, true)
    .translate(fingerLen / 2, 0, 0)
    .fillet(0.75)
    .color('tool'),
);
left
  .connector('hinge', {
    type: 'axis',
    origin: { kind: 'vec3', value: [0, 0, 0] },
    axis: [0, 0, 1],
  })
  .connector('tip', {
    type: 'frame',
    origin: { kind: 'vec3', value: [fingerLen, 0, 0] },
  });

const right = hand.part(
  'right-finger',
  box(fingerLen, fingerW, fingerT, true)
    .translate(-fingerLen / 2, 0, 0)
    .fillet(0.75)
    .color('tool'),
);
right
  .connector('hinge', {
    type: 'axis',
    origin: { kind: 'vec3', value: [0, 0, 0] },
    axis: [0, 0, 1],
  })
  .connector('tip', {
    type: 'frame',
    origin: { kind: 'vec3', value: [-fingerLen, 0, 0] },
  });

hand.mate('grip', 'palm.driver', 'grip-driver.axis', 'revolute', {
  pose: gripMin,
  limitsDeg: [gripMin, gripMax],
});
hand.mate('left-curl', 'palm.left-hinge', 'left-finger.hinge', 'revolute');
hand.mate('right-curl', 'palm.right-hinge', 'right-finger.hinge', 'revolute');

hand.coupleMates('left-curl', { source: 'grip', ratio: 1 });
hand.coupleMates('right-curl', { source: 'grip', ratio: -1 });

return hand.model();
