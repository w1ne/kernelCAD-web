// Hinge at 90°. The stop is a free root, so it is not in the base rigid
// group and the swing exclusion does not hide it. At coordinate 0 the
// link occupies x = 20..60 mm and the stop occupies x = 30..50 mm
// (minimum overlap 10 mm). At 90° about Z through x = 20 mm the link
// occupies x = 15..25 mm and clears the stop by 5 mm.

const arm = assembly('swing-clear');

arm.part('base', box(40, 40, 10, true))
  .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [20, 0, 0] }, axis: [0, 0, 1] });
arm.part('link', box(40, 10, 10, true))
  .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [-20, 0, 0] }, axis: [0, 0, 1] });
arm.part('stop', box(20, 10, 10, true), { at: [40, 0, 0] });
arm.mate('swing', 'base.hinge', 'link.hinge', 'revolute', { pose: 90, limitsDeg: [-20, 120] });
