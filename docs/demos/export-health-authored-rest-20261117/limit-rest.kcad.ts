// Authored pose 0 is outside the shoulder range [12°, 40°]. The boxes
// do not overlap, so a failure here is the joint range, not a contact.

const arm = assembly('limit-rest');
arm.part('base', box(10, 10, 10, true))
  .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [20, 0, 0] }, axis: [0, 0, 1] });
arm.part('link', box(10, 10, 10, true))
  .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
arm.mate('shoulder', 'base.hinge', 'link.hinge', 'revolute', { pose: 0, limitsDeg: [12, 40] });
