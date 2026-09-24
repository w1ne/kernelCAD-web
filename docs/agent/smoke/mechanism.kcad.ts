const shoulderDeg = param('shoulderDeg', 25, { min: -20, max: 70 });

const arm = assembly('supported-shoulder');

// Base: thick desk plate + two bearing towers (machine element, not a stick).
const base = arm.part(
  'base-frame',
  box(120, 100, 8, true)
    .translate(0, 0, 4)
    .union(box(20, 14, 52, true).translate(0, 40, 34))
    .union(box(20, 14, 52, true).translate(0, -40, 34)),
);
base.connector('shoulder', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 56] },
  axis: [0, 1, 0],
});

// Upper link: beam + yoke cheeks + hinge pin that stick out past the towers.
const upperLen = 110;
const pin = cylinder(100, 4).rotate([1, 0, 0], 90).translate(0, 50, 0);
const upper = arm.part(
  'upper-link',
  box(upperLen - 24, 14, 12, true)
    .translate(upperLen / 2, 0, 0)
    // Cheeks must overlap the beam in Y (beam half-extent 7) — ±10, not ±14.
    .union(box(22, 8, 28, true).translate(0, 10, 0))
    .union(box(22, 8, 28, true).translate(0, -10, 0))
    .union(pin)
    .union(box(14, 8, 22, true).translate(upperLen, 10, 0))
    .union(box(14, 8, 22, true).translate(upperLen, -10, 0)),
);
upper.connector('shoulder', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [0, 1, 0],
});

arm.mate('shoulder-pitch', 'base-frame.shoulder', 'upper-link.shoulder', 'revolute', {
  pose: shoulderDeg,
  limitsDeg: [-20, 70],
});

// Pin/tower contact is intentional hinge bearing — declare it.
return arm.solvedModel({}, { ignore: [['base-frame', 'upper-link']] });
