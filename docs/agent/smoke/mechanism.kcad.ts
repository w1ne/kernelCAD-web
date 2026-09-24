const shoulderDeg = param('shoulderDeg', 25, { min: -20, max: 70 });

const arm = assembly('supported-shoulder');

// Base: thick desk plate + two cylindrical bearing towers (machine element).
const base = arm.part(
  'base-frame',
  box(120, 100, 8, true)
    .translate(0, 0, 4)
    // BREP cylinder(h,r) sits on z=0..h — start at z=0 so towers fuse into the plate.
    .union(cylinder(56, 10).translate(0, 40, 0))
    .union(cylinder(56, 10).translate(0, -40, 0)),
);
base.connector('shoulder', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 56] },
  axis: [0, 1, 0],
});
base.connector('servo-mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [-40, 0, 8] },
});

// Seated shoulder servo — fastened to the base so the joint is actively driven.
// Park the servo on the rear of the desk plate — clear of the hinge pin/cheeks.
const servo = arm.part(
  'shoulder-servo',
  box(34, 28, 22, true).translate(-40, 0, 19).color('actuator'),
);
servo.connector('mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [-40, 0, 8] },
});

// Upper link: beam + yoke cheeks + hinge pin that stick out past the towers.
const upperLen = 110;
const pin = cylinder(100, 4).rotate([1, 0, 0], 90).translate(0, 50, 0);
const upper = arm.part(
  'upper-link',
  // Beam spans X; cheeks overlap beam in X and Y so the part is one solid.
  box(upperLen - 24, 14, 12, true)
    .translate(upperLen / 2, 0, 0)
    .union(box(36, 8, 28, true).translate(8, 10, 0))
    .union(box(36, 8, 28, true).translate(8, -10, 0))
    .union(pin)
    .union(box(28, 8, 22, true).translate(upperLen - 8, 10, 0))
    .union(box(28, 8, 22, true).translate(upperLen - 8, -10, 0)),
);
upper.connector('shoulder', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [0, 1, 0],
});

arm.mate('servo-mount', 'base-frame.servo-mount', 'shoulder-servo.mount', 'fastened');
arm.mate('shoulder-pitch', 'base-frame.shoulder', 'upper-link.shoulder', 'revolute', {
  pose: shoulderDeg,
  limitsDeg: [-20, 70],
});

// Driven hinge contract: towers + pin are the support; servo is the actuator.
arm.mechanicalJoint('shoulder-drive', {
  mate: 'shoulder-pitch',
  actuator: 'shoulder-servo',
  shaft: 'base-frame',
  supports: ['base-frame'],
  output: 'upper-link',
  requiredSupport: {
    kind: 'hinge-bracket',
    around: 'base-frame.shoulder',
    supports: ['base-frame'],
    minBearingLengthMm: 28,
  },
});

// Pin/tower contact is intentional hinge bearing — declare it.
return arm.solvedModel({}, { ignore: [['base-frame', 'upper-link']] });
