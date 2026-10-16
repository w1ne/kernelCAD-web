// BROKEN (masked sag): two flaps hinged on one base. 'swing' is a free
// passive hinge (gravity swinging it is fine), but 'rated' declares a load
// rating — it must hold, and it sags under gravity. The free flap's swing
// must not mask the rated flap's sag.
const knuckle = (y0: number, len: number) =>
  cylinder(len, 4).rotateX(-90).translate(0, y0, 4).subtract(cylinder(len + 2, 1.6).rotateX(-90).translate(0, y0 - 1, 4));
const baseLeaf = (dy: number) => box(37, 30, 2).translate(-42, -15 + dy, 0)
  .union(box(3, 10, 2).translate(-5.5, -15 + dy, 0))
  .union(box(3, 10, 2).translate(-5.5, 5 + dy, 0))
  .union(knuckle(-15 + dy, 10))
  .union(knuckle(5 + dy, 10));
const flap = (dy: number) => box(37, 30, 2).translate(5, -15 + dy, 0)
  .union(box(3, 10, 2).translate(2.5, -5 + dy, 0))
  .union(cylinder(10, 4).rotateX(-90).translate(0, -5 + dy, 4))
  .union(cylinder(36, 1.5).rotateX(-90).translate(0, -18 + dy, 4));

const arm = assembly('two-flaps');
const base = arm.part('base', baseLeaf(0).union(baseLeaf(60)).union(box(37, 30, 2).translate(-42, 15, 0)));
const f1 = arm.part('flap1', flap(0));
const f2 = arm.part('flap2', flap(60));
const axis = (y: number) => ({ type: 'axis' as const, origin: { kind: 'vec3' as const, value: [0, y, 4] as [number, number, number] }, axis: [0, 1, 0] as [number, number, number] });
base.connector('axis1', axis(0));
base.connector('axis2', axis(60));
f1.connector('axis', axis(0));
f2.connector('axis', axis(60));
arm.mate('swing', 'base.axis1', 'flap1.axis', 'revolute');
arm.mate('rated', 'base.axis2', 'flap2.axis', 'revolute', {
  limitsDeg: [-90, 90],
  capacity: { envelope: { maxResultantForceN: 50, maxResultantMomentNmm: 500 } },
});
return arm.solvedModel({});
