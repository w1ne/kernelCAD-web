// An L (slab x = 0..40, z = 0..10 and wall x = 0..10, z = 0..40) and an
// 8 mm cube whose world origin is (18, 0, 18) mm. The cube is 4 mm clear of
// both the slab top and the wall face. The collision cloud is the convex
// hull of the L, which fills that corner. The anchor is not fastened to the
// cube, so the pair is not excluded. The check reads the captured assembly.

const arm = assembly('hull-corner');
const slab = box(40, 20, 10, true).translate(20, 0, 5);
const wall = box(10, 20, 40, true).translate(5, 0, 20);
const axis = (origin) => ({ type: 'axis', origin: { kind: 'vec3', value: origin }, axis: [0, 1, 0] });

arm.part('ell', union(slab, wall)).connector('pin', axis([-30, 0, 0]));
arm.part('anchor', box(20, 20, 20, true))
  .connector('pin', axis([0, 0, 0]))
  .connector('seat', axis([48, 0, 18]));
arm.part('cube', box(8, 8, 8, true)).connector('seat', axis([0, 0, 0]));
arm.mate('pin', 'ell.pin', 'anchor.pin', 'revolute', { pose: 0, limitsDeg: [-90, 90] });
arm.mate('seat', 'anchor.seat', 'cube.seat', 'revolute', { pose: 0, limitsDeg: [-90, 90] });
